// Memorable layer: normalize (River router) → recall a learned path → replay it as a hint, or explore and learn.
// Extraction and embeddings come from the real Memorable API (/v1/extract, /v1/embed, bge-m3).
// Procedures are stored locally (JSONL with their embeddings) and recalled by cosine similarity,
// which is what the Memorable CLI's semantic tier does; the CLI itself is gated on `memorable enable`.
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { handleTicket, type Step, type Trace } from "./agent";
import * as shop from "./shop";

const API = process.env.MEMORABLE_API_URL ?? "https://memorable-extraction-api.memorable.workers.dev";
const THRESHOLD = Number(process.env.RECALL_THRESHOLD ?? 0.8);
const STORE = process.env.MEMORY_STORE ?? join(import.meta.dir, "../../replay/procedures.jsonl");

export type Procedure = {
  id: string;
  title: string;
  task: string;
  intent?: string;
  memorableSteps: { seq: number; action: string; repeat_count?: number }[];
  admitted?: boolean;
  path: string[];
  knowledge: { slug: string; text: string }[];
  tools: string[];
  embedding: number[];
  learnedFrom: string;
  createdAt: string;
};

export type Normalized = { request: string; intent?: string; confidence?: number; source: "river" | "raw" };
export type Solved = Trace & { recalled: boolean; procedureTitle?: string; similarity: number; normalized: Normalized; learned?: string };

let procedures: Procedure[] | null = null;

async function load(): Promise<Procedure[]> {
  if (procedures) return procedures;
  const f = Bun.file(STORE);
  procedures = (await f.exists()) ? (await f.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  return procedures;
}

export async function resetMemory() {
  procedures = [];
  mkdirSync(dirname(STORE), { recursive: true });
  await Bun.write(STORE, "");
}

export async function listProcedures() {
  return load();
}

async function memorable(path: string, body: unknown): Promise<any> {
  const key = process.env.MEMORABLE_API_KEY;
  if (!key) throw new Error("MEMORABLE_API_KEY missing");
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(new URL(path, API), {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    }).catch((e) => e as Error);
    if (!(r instanceof Error) && r.ok) return r.json();
    if (attempt >= 2) throw new Error(`memorable ${path}: ${r instanceof Error ? r.message : r.status}`);
    await Bun.sleep(500 * (attempt + 1));
  }
}

async function embed(text: string): Promise<number[]> {
  const j = await memorable("/v1/embed", { text: text.slice(0, 8000), input_type: "query" });
  return j.embedding;
}

function cosine(a: number[], b: number[]) {
  let d = 0, x = 0, y = 0;
  for (let i = 0; i < a.length; i++) { const p = a[i]!, q = b[i]!; d += p * q; x += p * p; y += q * q; }
  return d / Math.sqrt(x * y || 1);
}

export async function normalize(text: string): Promise<Normalized> {
  const url = process.env.ROUTER_URL;
  if (!url) return { request: text, source: "raw" };
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(15000) });
    const j: any = await r.json();
    if (typeof j.request === "string" && j.request) return { request: j.request, intent: j.intent, confidence: j.confidence, source: "river" };
  } catch {}
  return { request: text, source: "raw" };
}

export async function recall(query: string): Promise<{ procedure?: Procedure; similarity: number; embedding: number[] }> {
  const embedding = await embed(query);
  let best: Procedure | undefined, similarity = 0;
  for (const p of await load()) {
    const s = cosine(embedding, p.embedding);
    if (s > similarity) { similarity = s; best = p; }
  }
  return { procedure: best, similarity, embedding };
}

// Generalize a solved trace into a replayable path. The expensive part of exploring is finding the right
// company knowledge, so the path carries the policy text it found (never customer pages) and templates
// customer-specific arguments. Customer lookups stay as steps: they differ per ticket.
const isCustomer = (slug: unknown) => typeof slug === "string" && slug.startsWith("customers/");

function toPath(steps: Step[]): { path: string[]; knowledge: { slug: string; text: string }[] } {
  const path: string[] = [];
  const knowledge = new Map<string, string>();
  for (const s of steps) {
    const input = (s.input ?? {}) as Record<string, unknown>;
    let line: string | undefined;
    if (s.tool === "search_kb") {
      const hits = Array.isArray(s.output) ? (s.output as { slug: string; text: string }[]) : [];
      const policy = hits.filter((h) => !isCustomer(h.slug)).slice(0, 2);
      for (const h of policy) if (!knowledge.has(h.slug)) knowledge.set(h.slug, String(h.text).slice(0, 1200));
      if (hits.length && hits.filter((h) => isCustomer(h.slug)).length >= hits.length / 2) line = "search_kb (this customer's notes, by name or email)";
    } else if (s.tool === "read_page") {
      if (isCustomer(input.slug)) line = "read_page (this customer's page)";
      else if (!knowledge.has(String(input.slug))) knowledge.set(String(input.slug), String(s.output).slice(0, 2500));
    } else line = `${s.tool} (${Object.keys(input).join(", ")} from this ticket and its order)`;
    if (line && !path.includes(line)) path.push(line);
  }
  return { path, knowledge: [...knowledge].map(([slug, text]) => ({ slug, text })) };
}

// Replaying a path means running its read-only lookups directly, without the model: the arguments come
// from the ticket (email, order id) and from earlier lookups (tracking numbers). Only the reasoning,
// the write actions and the reply go to the model.
function prefetch(ticket: string, p: Procedure): Step[] {
  const email = ticket.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0];
  const orderId = ticket.match(/\bKC-\d+\b/i)?.[0];
  const want = new Set(p.tools);
  const steps: Step[] = [];
  const run = (tool: string, input: any, fn: () => unknown) => { const output = fn(); steps.push({ tool, input, output }); return output; };
  if (want.has("find_customer") && email) run("find_customer", { email }, () => shop.findCustomer({ email }));
  let orders: shop.Order[] = [];
  if (want.has("find_orders") && (orderId || email)) {
    const q = orderId ? { orderId } : { email };
    orders = run("find_orders", q, () => shop.findOrders(q)) as shop.Order[];
  }
  if (want.has("get_refunds") && (orderId || email)) { const q = orderId ? { orderId } : { email }; run("get_refunds", q, () => shop.getRefunds(q)); }
  if (want.has("get_invoices") && (orderId || email)) { const q = orderId ? { orderId } : { email }; run("get_invoices", q, () => shop.getInvoices(q)); }
  if (want.has("get_tracking")) for (const o of orders.slice(0, 3)) if (o.tracking) run("get_tracking", { trackingNumber: o.tracking }, () => shop.getTracking(o.tracking!));
  return steps;
}

function hintFor(p: Procedure, similarity: number, done: Step[]) {
  return [
    `Learned procedure "${p.title}" (recalled from memory, similarity ${similarity.toFixed(2)}).`,
    `The company policy this case needs was already retrieved from the brain; use it instead of searching again:`,
    ...p.knowledge.map((k) => `[${k.slug}]\n${k.text}`),
    `Steps:`,
    ...p.path.map((l, i) => `${i + 1}. ${l}`),
    ...(done.length ? [`These lookups were already run for this ticket (do not repeat them):`, ...done.map((s) => `${s.tool} ${JSON.stringify(s.input)} → ${JSON.stringify(s.output)}`)] : []),
    `Do the remaining steps, then reply. Search the brain only if this ticket turns out to be a different case.`,
  ].join("\n");
}

async function learn(ticketId: string, normalized: Normalized, trace: Trace, embedding: number[]): Promise<Procedure | undefined> {
  const res = await memorable("/v1/extract", {
    session_id: `${ticketId}-${Date.now()}`,
    task_description: normalized.request.slice(0, 200),
    harness: "kettle-support-agent",
    tool_calls: trace.steps.map((s) => ({ name: s.tool, input: s.input, result: JSON.stringify(s.output).slice(0, 2000) })),
  });
  const d = res.draft;
  if (!d) return;
  const p: Procedure = {
    id: `proc-${(await load()).length + 1}`,
    title: d.title ?? normalized.request,
    task: normalized.request,
    intent: normalized.intent,
    memorableSteps: (d.steps ?? []).map((s: any) => ({ seq: s.seq, action: s.action, repeat_count: s.repeat_count })),
    admitted: res.judge?.admitted,
    ...toPath(trace.steps),
    tools: [...new Set(trace.steps.map((s) => s.tool))],
    embedding: d.embedding?.length ? d.embedding : embedding,
    learnedFrom: ticketId,
    createdAt: new Date().toISOString(),
  };
  procedures!.push(p);
  mkdirSync(dirname(STORE), { recursive: true });
  appendFileSync(STORE, JSON.stringify(p) + "\n");
  return p;
}

const succeeded = (t: Trace) => t.reply.trim().length > 0 && t.steps.length > 0;

export async function solve(ticket: string, opts: { id?: string; learn?: boolean; recall?: boolean } = {}): Promise<Solved> {
  const normalized = await normalize(ticket);
  const r = opts.recall === false ? { similarity: 0, embedding: await embed(normalized.request) } : await recall(normalized.request);
  const hit = r.procedure && r.similarity >= THRESHOLD ? r.procedure : undefined;
  const done = hit ? prefetch(ticket, hit) : [];
  const t = await handleTicket(ticket, hit ? hintFor(hit, r.similarity, done) : undefined);
  const trace: Trace = { ...t, steps: [...done, ...t.steps] };

  // Learn when we explored, or when a recalled path clearly did not fit (the agent used different tools).
  let learned: string | undefined;
  const used = new Set(trace.steps.map((s) => s.tool));
  const drifted = hit && [...used].filter((t) => !hit.tools.includes(t)).length > 0;
  if (opts.learn !== false && succeeded(trace) && (!hit || drifted)) {
    learned = (await learn(opts.id ?? "adhoc", normalized, trace, r.embedding).catch(() => undefined))?.id;
  }
  return { ...trace, recalled: !!hit, procedureTitle: hit?.title, similarity: r.similarity, normalized, learned };
}
