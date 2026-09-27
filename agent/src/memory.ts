// Memorable layer: normalize (River router) → recall a learned path → replay it as a hint, or explore and learn.
// Extraction and embeddings come from the real Memorable API (/v1/extract, /v1/embed, bge-m3).
// Procedures are stored locally (JSONL with their embeddings) and recalled by cosine similarity,
// which is what the Memorable CLI's semantic tier does; the CLI itself is gated on `memorable enable`.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { dirname, join } from "node:path";
import { handleTicket, type Step, type Trace } from "./agent";
import { haikuCanonical, render, signature, validate, type Canonical } from "./canonical";
import * as shop from "./shop";

const API = process.env.MEMORABLE_API_URL ?? "https://memorable-extraction-api.memorable.workers.dev";
const THRESHOLD = Number(process.env.RECALL_THRESHOLD ?? 0.8);
const STORE = process.env.MEMORY_STORE ?? join(import.meta.dir, "../../replay/procedures.jsonl");

export type Procedure = {
  id: string;
  signature?: string; // canonical goal signature (operation:subject per task); reuse only within the same goals
  key?: string; // standardized request (intent label) the path is filed under; raw-text procedures have none
  goldIntent?: string; // dataset label of the ticket it was learned from (evaluation only, never used for routing)
  uses?: number; // times recalled and replayed successfully
  revisions?: number; // times the path was rewritten after a same-key replay was abandoned
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

export type Normalizer = "river" | "haiku" | "raw";
// `request` is the standardized request used for recall and as the procedure key: River's `rendered` description,
// or for Haiku the fixed rendered sentence of its intent label. Raw text when nothing standardized it.
export type Normalized = {
  request: string; standardized: boolean; intent?: string; canonical?: unknown; signature?: string; why?: string; confidence?: number; source: Normalizer; model?: string;
  inputTokens?: number; outputTokens?: number;
};
export type Solved = Trace & {
  recalled: boolean; procedureId?: string; procedureTitle?: string; procedureIntent?: string; procedureTools?: string[]; similarity: number; normalized: Normalized;
  learned?: string; reinforced?: string; revised?: string; abandoned?: boolean; library: number;
  tier: "explored" | "recalled" | "compiled"; backend?: string; planId?: string;
  shadow?: { planId: string; agree: boolean; trial: number; promoted: boolean; why?: string }; shadowCost?: number;
};

// 27 Bitext intents (data/ROUTER.md). A standardized request is one of these labels.
const BITEXT_INTENTS = [
  "create_account", "delete_account", "edit_account", "recover_password", "registration_problems", "switch_account",
  "check_cancellation_fee", "contact_customer_service", "contact_human_agent", "delivery_options", "delivery_period",
  "complaint", "review", "check_invoice", "get_invoice", "cancel_order", "change_order", "place_order", "track_order",
  "check_payment_methods", "payment_issue", "check_refund_policy", "get_refund", "track_refund",
  "change_shipping_address", "set_up_shipping_address", "newsletter_subscription",
] as const;

// The label set comes from data/ROUTER.md (table rows: `label | description`, or a category row listing labels
// separated by commas), so switching datasets only means updating that file. Falls back to the Bitext 27.
const ROUTER_MD = process.env.ROUTER_SPEC ?? join(import.meta.dir, "../../data/ROUTER.md");
function loadLabels(): { labels: string[]; gloss: Record<string, string> } {
  const labels: string[] = [], gloss: Record<string, string> = {};
  const isLabel = (x: string) => /^[a-z][a-z0-9_]*$/.test(x) && x.includes("_") || /^[a-z]+$/.test(x) && x.length > 3;
  const add = (l: string, g?: string) => { if (!labels.includes(l) && l !== "none") labels.push(l); if (g && !gloss[l]) gloss[l] = g; };
  try {
    if (!existsSync(ROUTER_MD)) throw 0;
    let inLabels = false;
    for (const line of readFileSync(ROUTER_MD, "utf8").split("\n")) {
      if (/^#+ /.test(line)) inLabels = /label|intent|subflow/i.test(line);
      if (!inLabels || !line.trim().startsWith("|") || /^\|[\s:-]+\|/.test(line)) continue;
      const cells = line.split("|").slice(1, -1).map((c) => c.replace(/`/g, "").trim());
      if (cells.length >= 2 && isLabel(cells[0]!) && !cells[1]!.includes(",") && !isLabel(cells[1]!)) { add(cells[0]!, cells.slice(1).join(" — ")); continue; }
      // Group row: first cell is the group (flow/category), the rest list labels. The group names the label's context.
      const group = cells[0]!, words = (x: string) => x.replace(/_/g, " ");
      for (const c of cells.slice(1)) for (const tok of c.split(/,\s*/)) if (isLabel(tok.trim())) add(tok.trim(), /^[a-z_]+$/.test(group) ? `${words(group)}: ${words(tok.trim())}` : undefined);
    }
  } catch {}
  return labels.length >= 5 ? { labels, gloss } : { labels: [...BITEXT_INTENTS], gloss: {} };
}
const LOADED = loadLabels();
export const INTENTS: readonly string[] = LOADED.labels;
const INTENT_SET = new Set<string>(INTENTS);

// Application-owned rendering (CANONICAL_REQUEST_V1 style) for the Haiku fallback: one fixed sentence per label.
const RENDERED: Record<(typeof BITEXT_INTENTS)[number], string> = {
  create_account: "Task 1: Request a new account for the customer.",
  delete_account: "Task 1: Request deletion of the customer's account.",
  edit_account: "Task 1: Request a change to the customer's account details.",
  recover_password: "Task 1: Request account access recovery (password reset) for the customer.",
  registration_problems: "Task 1: Troubleshoot a problem with account registration.",
  switch_account: "Task 1: Request a change of the customer's account plan or account.",
  check_cancellation_fee: "Task 1: Explain the cancellation fee policy.",
  contact_customer_service: "Task 1: Explain how to contact customer service.",
  contact_human_agent: "Task 1: Request contact with a human agent.",
  delivery_options: "Task 1: Explain the available delivery options.",
  delivery_period: "Task 1: Retrieve delivery information for order_1.\nRequested outputs: estimated arrival.",
  complaint: "Task 1: Request that a complaint be filed.",
  review: "Task 1: Request that customer feedback be recorded.",
  check_invoice: "Task 1: Retrieve invoice information for order_1.",
  get_invoice: "Task 1: Request a copy of the invoice for order_1.",
  cancel_order: "Task 1: Request cancellation of order_1.",
  change_order: "Task 1: Request a change to the items of order_1.",
  place_order: "Task 1: Request a new order for the customer.",
  track_order: "Task 1: Retrieve delivery information for order_1.\nRequested outputs: current status.",
  check_payment_methods: "Task 1: Explain the accepted payment methods.",
  payment_issue: "Task 1: Troubleshoot a payment problem for order_1.",
  check_refund_policy: "Task 1: Explain the refund policy.",
  get_refund: "Task 1: Request a refund for order_1.",
  track_refund: "Task 1: Retrieve refund information for order_1.\nRequested outputs: current status.",
  change_shipping_address: "Task 1: Request a change of the shipping address of order_1.",
  set_up_shipping_address: "Task 1: Request a new default shipping address for the customer.",
  newsletter_subscription: "Task 1: Request a change to the customer's newsletter subscription.",
};
// Labels without a hand-written sentence (e.g. ABCD subflows) render from their description or name.
export const renderIntent = (intent: string): string =>
  (!LOADED.gloss[intent] && (RENDERED as Record<string, string>)[intent]) || `Task 1: ${(LOADED.gloss[intent] ?? intent.replace(/_/g, " ")).replace(/\.$/, "")}.`;
const INTENT_OF = new Map<string, string>([...INTENTS.map((i) => [i, i] as const), ...INTENTS.map((i) => [renderIntent(i), i] as const)]);

let procedures: Procedure[] | null = null;

// Drop the in-process cache so the next recall re-reads the store (other processes may have written it).
export function reload() {
  procedures = null;
}

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

// Global pacing for Memorable API calls (all paths): at most one request per MEMORABLE_MIN_MS.
let nextSlot = 0;
async function pace() {
  const gap = Number(process.env.MEMORABLE_MIN_MS ?? 400);
  const now = Date.now(), at = Math.max(now, nextSlot);
  nextSlot = at + gap;
  if (at > now) await Bun.sleep(at - now);
}

// MEMORABLE_OFFLINE=1 (e.g. daily quota exhausted): no Memorable API calls; exact-key recall and procedures built
// locally from the tool trace. Also switches on automatically after a quota 429.
let offline = process.env.MEMORABLE_OFFLINE === "1";
export const memorableOffline = () => offline;
async function memorable(path: string, body: unknown): Promise<any> {
  if (offline) throw new Error("memorable offline");
  const key = process.env.MEMORABLE_API_KEY;
  if (!key) throw new Error("MEMORABLE_API_KEY missing");
  for (let attempt = 0; ; attempt++) {
    await pace();
    const r = await fetch(new URL(path, API), {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    }).catch((e) => e as Error);
    if (!(r instanceof Error) && r.ok) return r.json();
    const limited = !(r instanceof Error) && r.status === 429;
    if (limited && attempt >= 2) { offline = true; throw new Error(`memorable ${path}: 429 (quota) → offline`); }
    if (attempt >= 3) throw new Error(`memorable ${path}: ${r instanceof Error ? r.message : r.status}`);
    await Bun.sleep(Math.min(20000, (limited ? 1000 : 500) * 2 ** attempt) * (0.5 + Math.random()));
  }
}

// Embeddings: cached per text and rate-limited (Memorable returns 429 under parallel replay load).
const embedCache = new Map<string, Promise<number[]>>();
let embedActive = 0;
const EMBED_MAX = Number(process.env.EMBED_CONCURRENCY ?? 2);
export function embed(text: string): Promise<number[]> {
  const key = text.slice(0, 8000);
  if (!embedCache.has(key)) {
    const p = (async () => {
      while (embedActive >= EMBED_MAX) await Bun.sleep(50 + Math.random() * 100);
      embedActive++;
      try { return (await memorable("/v1/embed", { text: key, input_type: "query" })).embedding as number[]; }
      catch { return [] as number[]; } // offline/quota: no embedding, exact-key recall only
      finally { embedActive--; }
    })();
    p.catch(() => embedCache.delete(key));
    embedCache.set(key, p);
  }
  return embedCache.get(key)!;
}

export function cosine(a: number[], b: number[]) {
  let d = 0, x = 0, y = 0;
  for (let i = 0; i < a.length; i++) { const p = a[i]!, q = b[i]!; d += p * q; x += p * p; y += q * q; }
  return d / Math.sqrt(x * y || 1);
}

// Pluggable normalizer. ROUTER_URL (Marc's River model, POST {text}) wins when set; otherwise NORMALIZER=haiku asks
// claude-haiku-4-5 for an intent label and renders its fixed sentence; otherwise the raw ticket text is the request.
// River may answer {rendered, canonical} (CANONICAL_REQUEST_V1), {request} or {intent, confidence}. Any failure,
// "none" or unresolved output falls back to raw text, labelled as such.
export function activeNormalizer(): Normalizer {
  if (process.env.ROUTER_URL) return "river";
  return process.env.NORMALIZER === "haiku" ? "haiku" : "raw";
}

// "Haiku stand-in for River": claude-haiku-4-5 emits CANONICAL_REQUEST_V1 JSON, the app validates and renders it.
async function haikuStandIn(text: string): Promise<Normalized> {
  const h = await haikuCanonical(text);
  const usage = { inputTokens: h.inputTokens, outputTokens: h.outputTokens };
  if (!h.rendered) return { request: text, standardized: false, canonical: h.canonical, why: h.why, source: "haiku", ...usage };
  return { request: h.rendered, standardized: true, canonical: h.canonical, signature: h.sig, source: "haiku", ...usage };
}

async function river(text: string): Promise<Normalized | undefined> {
  const r = await fetch(process.env.ROUTER_URL!, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(30000) });
  if (!r.ok) return;
  const j: any = await r.json();
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const intentRaw = str(j.intent);
  const intent = intentRaw && INTENT_SET.has(intentRaw) ? intentRaw : undefined;
  if (Array.isArray(j.canonical?.unresolved) && j.canonical.unresolved.length) return; // contract: unresolved → normal solving
  const v = j.canonical ? validate(j.canonical) : undefined;
  const request = str(j.rendered) ?? (v?.ok ? render(v.canonical!) : undefined) ?? str(j.request) ?? (intent ? renderIntent(intent) : undefined);
  if (!request) return;
  return { request, standardized: true, intent: intent ?? INTENT_OF.get(request), canonical: j.canonical, signature: v?.ok ? signature(v.canonical!) : undefined, confidence: j.confidence, source: "river", model: str(j.model) ? `river:${String(j.model).replace(/^river:/, "")}` : "river" };
}

let anthropic: Anthropic | undefined;
const GLOSS: Record<string, string> = {
  create_account: "open/sign up for a new account", delete_account: "close or delete the account", edit_account: "change profile/account details",
  recover_password: "forgot password, can't log in, reset PIN", registration_problems: "error or trouble while signing up",
  switch_account: "switch to another account or plan (standard/plus/freemium)", check_cancellation_fee: "fee or penalty for cancelling",
  contact_customer_service: "how to reach customer service, hours, phone/email", contact_human_agent: "wants to talk to a real person/agent now",
  delivery_options: "which shipping methods/options exist", delivery_period: "when will it arrive, how long does delivery take",
  complaint: "file a complaint, unhappy with service", review: "leave feedback or a review", check_invoice: "look at/find an invoice or bill",
  get_invoice: "get/download/send a copy of an invoice", cancel_order: "cancel an order", change_order: "modify items in an order",
  place_order: "buy/purchase/order something new", track_order: "status or location of an existing order",
  check_payment_methods: "which payment methods are accepted", payment_issue: "payment failed, charged wrongly, card problem",
  check_refund_policy: "what is the refund/return policy", get_refund: "wants money back / a refund", track_refund: "status of a refund already requested",
  change_shipping_address: "change the delivery address", set_up_shipping_address: "add/set up a new shipping address",
  newsletter_subscription: "subscribe/unsubscribe newsletter",
};

// ABCD subflows (data/ROUTER.md label set when the dataset is ABCD): what the customer's opening message is about.
const ABCD_GLOSS: Record<string, string> = {
  recover_username: "forgot username", recover_password: "forgot password / can't log in", reset_2fa: "two-factor / verification code problem, lost phone for 2FA",
  status_service_added: "charged for a service/subscription they did not add", status_service_removed: "a service was removed from the account, wants it back",
  status_shipping_question: "question about shipping settings on the account (e.g. free/premium shipping)", status_credit_missing: "store credit or promo credit missing from account",
  manage_change_address: "update the address on the account", manage_change_name: "change the name on the account", manage_change_phone: "change the phone number on the account",
  manage_payment_method: "change/update the payment method on the account",
  status_mystery_fee: "unexpected/unknown fee or charge on an order", status_delivery_time: "when will my order arrive / delivery date of an order",
  status_payment_method: "change how an order was paid", status_quantity: "wrong quantity in an order / ordered too many",
  manage_upgrade: "upgrade shipping on an existing order", manage_downgrade: "downgrade/cheaper shipping on an existing order",
  manage_create: "wants to place a new order through the agent", manage_cancel: "cancel an order",
  refund_initiate: "start a refund for a purchase", refund_update: "change the refund method or amount of an existing refund",
  refund_status: "where is my refund / refund status", return_stain: "return an item that is stained/damaged",
  return_color: "return an item because of the wrong/unwanted color", return_size: "return an item because of the wrong size / doesn't fit",
  bad_price_competitor: "found it cheaper at a competitor, wants price match", bad_price_yesterday: "price dropped after buying, wants the difference",
  out_of_stock_general: "general complaint that items are out of stock", out_of_stock_one_item: "a specific item is out of stock, wants to buy it",
  promo_code_invalid: "promo code does not work", promo_code_out_of_date: "promo code expired",
  mistimed_billing_already_returned: "billed for an item already returned", mistimed_billing_never_bought: "billed for something never bought",
  status: "check the shipping status of an order / has it shipped", manage: "change shipping details (address/method) of an order in transit",
  missing: "order arrived with an item missing / package never arrived", cost: "question about or dispute of shipping cost",
  boots: "question about boots (product info)", shirt: "question about shirts (product info)", jeans: "question about jeans (product info)", jacket: "question about jackets (product info)",
  pricing: "general pricing questions", membership: "membership levels and benefits", timing: "store hours, shipping times, general timing questions", policy: "store policies (returns, exchanges, etc.)",
  status_active: "is my subscription active", status_due_amount: "how much is due on my subscription bill", status_due_date: "when is my subscription bill due",
  manage_pay_bill: "pay the subscription bill", manage_extension: "extend the subscription / more time to pay", manage_dispute_bill: "dispute a subscription charge",
  credit_card: "credit card not accepted at checkout on the site", shopping_cart: "shopping cart not working/updating on the site",
  search_results: "site search returns wrong/no results", slow_speed: "website is slow/not loading",
};
const HAIKU_SYSTEM = `You route customer-support tickets for an online shop. Reply with exactly one intent label from this list and nothing else:
${INTENTS.map((i) => { const g = [LOADED.gloss[i], ABCD_GLOSS[i] ?? (LOADED.gloss[i] ? undefined : GLOSS[i])].filter(Boolean).join(" — "); return g ? `${i}: ${g}` : i; }).join("\n")}
none: only if no label fits at all`;

async function haiku(text: string): Promise<Normalized | undefined> {
  anthropic ??= new Anthropic();
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await anthropic.messages.create({ model: process.env.NORMALIZER_MODEL ?? "claude-haiku-4-5", max_tokens: 16, system: HAIKU_SYSTEM, messages: [{ role: "user", content: text.slice(0, 2000) }] });
      const out = r.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim().toLowerCase();
      const intent = out.match(/[a-z_]+/)?.[0];
      const usage = { inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens };
      if (intent && INTENT_SET.has(intent)) return { request: renderIntent(intent)!, standardized: true, intent, canonical: { version: 1, intent }, source: "haiku", ...usage };
      return { request: text, standardized: false, source: "haiku", ...usage }; // "none": explore, no key
    } catch (e) {
      if (attempt >= 2) throw e;
      await Bun.sleep(700 * (attempt + 1));
    }
  }
}

export async function normalize(text: string, which: Normalizer = activeNormalizer()): Promise<Normalized> {
  try {
    const n = which === "river" ? await river(text) : which === "haiku" ? (process.env.NORMALIZER_MODE === "label" ? await haiku(text) : await haikuStandIn(text)) : undefined;
    if (n) return n;
  } catch {}
  return { request: text, standardized: false, source: "raw" };
}

// The ticket text without the "(from: …)" line, so raw-text similarity is not driven by the sender.
const body = (ticket: string) => ticket.replace(/\n*\(from: [^)]*\)\s*$/i, "").trim();

// Procedure store behind a small interface: local JSONL + bge-m3 cosine (default), or Memorable itself
// (RECALL_BACKEND=memorable, agent/src/memorable-store.ts), with the local store as fallback when Memorable errors.
export type Recalled = { procedure?: Procedure; similarity: number; embedding: number[]; keyed?: boolean; backend: string };
const BACKEND = process.env.RECALL_BACKEND === "memorable" ? "memorable" : "local";
const MEMORABLE_THRESHOLD = Number(process.env.MEMORABLE_RECALL_THRESHOLD ?? 0.6);
let remote: any;
async function memorableStore() {
  if (remote === undefined) remote = await import("./memorable-store").then((m) => m.memorableStore).catch(() => null);
  return remote;
}
export const recallThreshold = (backend: string) => (backend === "memorable" ? MEMORABLE_THRESHOLD : THRESHOLD);

// Exact rendered request first (similarity 1), else nearest embedding; only between requests with the same canonical
// goal signature (and never across two different known eval labels when label mode is used).
export async function recall(query: string, sig?: string): Promise<Recalled> {
  const all = await load();
  const exact = all.find((p) => p.key === query && (!sig || !p.signature || p.signature === sig));
  if (exact) return { procedure: exact, similarity: 1, embedding: [], keyed: true, backend: BACKEND === "memorable" ? "memorable:key" : "local:key" };
  if (BACKEND === "memorable" && !offline) {
    const store = await memorableStore();
    const r = store ? await store.recall(query).catch(() => undefined) : undefined;
    if (r && r.similarity > 0) {
      const local = r.procedure && all.find((p) => p.id === r.procedure.id || p.key === r.procedure.key);
      const procedure = local ?? r.procedure;
      if (procedure && sig && procedure.signature && procedure.signature !== sig) return { similarity: r.similarity, embedding: [], backend: "memorable" };
      if (procedure && procedure.intent && INTENT_OF.get(query) && procedure.intent !== INTENT_OF.get(query)) return { similarity: r.similarity, embedding: [], backend: "memorable" }; // different standardized request
      return { procedure, similarity: r.similarity, embedding: [], backend: "memorable" };
    }
  }
  const same = (p: Procedure) => !sig || !p.signature || p.signature === sig;
  const keyed = all.find((p) => p.key === query && same(p));
  if (keyed) return { procedure: keyed, similarity: 1, embedding: [], keyed: true, backend: "local" };
  const embedding = await embed(query);
  if (!embedding.length) return { similarity: 0, embedding, backend: "local" };
  const qIntent = INTENT_OF.get(query);
  let best: Procedure | undefined, similarity = 0;
  for (const p of all) {
    if (!same(p)) continue;
    if (qIntent && p.intent && p.intent !== qIntent) continue;
    const s = cosine(embedding, p.embedding);
    if (s > similarity) { similarity = s; best = p; }
  }
  return { procedure: best, similarity, embedding, backend: "local" };
}

function persist() {
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, procedures!.map((p) => JSON.stringify(p)).join("\n") + (procedures!.length ? "\n" : ""));
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
  const orderId = ticket.match(/\bKC-\d+\b/i)?.[0] ?? ticket.match(/\b\d{10}\b/)?.[0];
  const want = new Set(p.tools);
  const steps: Step[] = [];
  const run = (tool: string, input: any, fn: () => unknown) => { const output = fn(); steps.push({ tool, input, output }); return output; };
  const q = orderId ? { orderId } : { email };
  const has = (fn: string) => typeof (shop as any)[fn] === "function";
  // ABCD tool set (Northwind): read-only lookups only; verify/validate/record steps stay with the model.
  if (want.has("pull_up_account") && email && has("pullUpAccount")) run("pull_up_account", { email }, () => (shop as any).pullUpAccount({ email }));
  if (want.has("subscription_status") && email && has("subscriptionStatus")) run("subscription_status", { email }, () => (shop as any).subscriptionStatus(email));
  // Earlier (Kettle) tool set.
  if (want.has("find_customer") && email) run("find_customer", { email }, () => shop.findCustomer({ email }));
  let orders: shop.Order[] = [];
  if (want.has("find_orders") && (orderId || email)) orders = run("find_orders", q, () => shop.findOrders(q)) as shop.Order[];
  if (want.has("shipping_status") && orderId && has("shippingStatus")) run("shipping_status", { orderId }, () => (shop as any).shippingStatus(orderId));
  if (want.has("get_refunds") && (orderId || email)) run("get_refunds", q, () => shop.getRefunds(q));
  if (want.has("get_invoices") && (orderId || email) && has("getInvoices")) run("get_invoices", q, () => (shop as any).getInvoices(q));
  if (want.has("get_tracking")) for (const o of (Array.isArray(orders) ? orders : []).slice(0, 3)) if (o.tracking) run("get_tracking", { trackingNumber: o.tracking }, () => shop.getTracking(o.tracking!));
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

// Save a solved session as a procedure (Memorable /v1/extract + local path). Exported for the QM MCP server.
// Returns the existing procedure (reinforced) when its standardized key is already filed.
export async function saveProcedure(args: {
  sessionId: string; normalized: Normalized; steps: Step[]; ticket?: string; embedding?: number[]; goldIntent?: string; harness?: string;
}): Promise<{ procedure?: Procedure; created: boolean }> {
  const { normalized, steps } = args;
  await load();
  const key = normalized.standardized ? normalized.request : undefined;
  const known = () => (key ? procedures!.find((p) => p.key === key) : undefined);
  const reinforce = (p: Procedure) => { p.uses = (p.uses ?? 0) + 1; persist(); return { procedure: p, created: false }; };
  if (known()) return reinforce(known()!);
  const res = await memorable("/v1/extract", {
    session_id: `${args.sessionId}-${Date.now()}`,
    task_description: (key && args.ticket ? `${key} Original: ${args.ticket}` : normalized.request).slice(0, 400),
    harness: args.harness ?? "kettle-support-agent",
    tool_calls: steps.map((s) => ({ name: s.tool, input: s.input, result: JSON.stringify(s.output ?? "").slice(0, 2000) })),
  }).catch(() => null);
  const d = res?.draft;
  if (known()) return reinforce(known()!); // a concurrent worker filed this key while we were extracting
  const embedding = args.embedding?.length ? args.embedding : await embed(normalized.request);
  const p: Procedure = {
    id: `proc-${procedures!.length + 1}`,
    key,
    signature: normalized.signature,
    title: (normalized.intent ?? d?.title ?? normalized.request.split("\n")[0]!).slice(0, 120),
    task: normalized.request,
    intent: normalized.intent,
    goldIntent: args.goldIntent,
    uses: 0,
    revisions: 0,
    memorableSteps: (d?.steps ?? []).map((s: any) => ({ seq: s.seq, action: s.action, repeat_count: s.repeat_count })),
    admitted: res?.judge?.admitted,
    ...toPath(steps),
    tools: [...new Set(steps.map((s) => s.tool))],
    // Keyed paths keep the embedding of their standardized request so semantic fallback stays in that space.
    embedding: key ? embedding : d?.embedding?.length ? d.embedding : embedding,
    learnedFrom: args.sessionId,
    createdAt: new Date().toISOString(),
  };
  procedures!.push(p);
  mkdirSync(dirname(STORE), { recursive: true });
  appendFileSync(STORE, JSON.stringify(p) + "\n");
  if (BACKEND === "memorable" && !offline) { const store = await memorableStore(); await store?.save(p).catch(() => undefined); }
  return { procedure: p, created: true };
}

const succeeded = (t: Trace) => t.reply.trim().length > 0 && t.steps.length > 0;

// The replay was abandoned when the agent went back to the brain for policy (the hint says to do that only
// for a different case) and none of the path's own action tools were used.
const LOOKUPS = new Set(["search_kb", "read_page", "find_customer", "find_orders", "get_tracking", "get_refunds", "get_invoices", "list_products", "pull_up_account", "shipping_status", "subscription_status"]);
function abandonedPath(p: Procedure, modelSteps: Step[]) {
  const searched = modelSteps.some((s) => (s.tool === "search_kb" || s.tool === "read_page") && !isCustomer((s.input as any)?.slug) && !JSON.stringify(s.output ?? "").includes('"customers/'));
  if (!searched) return false;
  const actions = p.tools.filter((t) => !LOOKUPS.has(t));
  const used = new Set(modelSteps.map((s) => s.tool));
  return actions.length === 0 ? true : !actions.some((t) => used.has(t));
}

// Optional compiled tier (agent/src/compiled.ts, another workstream): deterministic plans with zero model calls.
let compiledMod: any;
async function compiled() {
  if (compiledMod === undefined) compiledMod = await import("./compiled" + "").catch(() => null);
  return compiledMod;
}

// ---- shadow promotion of compiled plans ----
type Shadow = { trials: number; agree: number; promoted: boolean; rejected: boolean };
const shadows = new Map<string, Shadow>();
const SHADOW_LOG = join(import.meta.dir, "../../replay/shadow.jsonl");
// Plans enabled when the run starts (validated offline) serve right away; plans compiled during the run start in shadow.
function shadowState(id: string, plan?: any): Shadow {
  if (!shadows.has(id)) { const pre = !!plan && plan.enabled !== false && !plan.shadowPending; shadows.set(id, { trials: 0, agree: 0, promoted: pre, rejected: !!plan?.shadowRejected }); }
  return shadows.get(id)!;
}
function planFor(cm: any, task: { operation: string; subject: string; topic?: string }) {
  const live = (cm.loadPlans() as any[]).filter((p) => p.enabled !== false || p.shadowPending);
  for (const p of live) shadowState(p.id, p);
  if (task.topic) return live.find((p) => p.match.topic === task.topic);
  const same = live.filter((p) => p.match.operation === task.operation && p.match.subject === task.subject);
  return same.length === 1 ? same[0] : undefined; // canonical goals must pick exactly one plan
}
async function runShadow(cm: any, plan: any, task: any, ticket: string, trace: Trace) {
  const st = shadowState(plan.id);
  if (st.trials >= 3) return;
  const c = await cm.execute(plan, task, ticket, { dryRun: true }).catch(() => null);
  let agree = false, why = "plan could not run", cost = 0;
  if (c) {
    anthropic ??= new Anthropic();
    const r = await anthropic.messages.create({
      model: process.env.NORMALIZER_MODEL ?? "claude-haiku-4-5", max_tokens: 5,
      system: "Two support replies to the same customer message. Answer yes if the compiled reply gives the same outcome and facts as the agent reply (same action taken or information given, no contradiction), else no. One word.",
      messages: [{ role: "user", content: `Customer: ${body(ticket).slice(0, 800)}\n\nAgent reply: ${trace.reply.slice(0, 1500)}\n\nCompiled reply: ${c.reply.slice(0, 1500)}` }],
    });
    cost = r.usage.input_tokens / 1e6 + (r.usage.output_tokens * 5) / 1e6;
    agree = /^\s*yes/i.test(r.content.map((b: any) => b.text ?? "").join(""));
    why = agree ? "agrees with agent" : "differs from agent";
  }
  st.trials++;
  if (agree) st.agree++;
  if (st.agree >= 2) { st.promoted = true; plan.enabled = true; delete plan.shadowPending; cm.savePlan(plan); }
  else if (st.trials >= 3) { st.rejected = true; plan.shadowRejected = true; cm.savePlan(plan); }
  try { appendFileSync(SHADOW_LOG, JSON.stringify({ at: new Date().toISOString(), plan: plan.id, ticket: body(ticket).slice(0, 200), agreed: agree, why, ...st }) + "\n"); } catch {}
  return { shadow: { planId: plan.id, agree, trial: st.trials, promoted: st.promoted, why }, cost };
}

// Replaying a recalled path: only the path's tools plus brain fallback, and low effort.
const REPLAY_EFFORT = (process.env.REPLAY_EFFORT ?? "low") as "low" | "medium" | "high";
const replayTools = (p: Procedure) => [...new Set([...p.tools, "search_kb", "read_page", "pull_up_account"])];

export async function solve(ticket: string, opts: { id?: string; learn?: boolean; recall?: boolean; goldIntent?: string } = {}): Promise<Solved> {
  if (opts.recall === false && opts.learn === false) {
    const t = await handleTicket(ticket);
    return { ...t, recalled: false, similarity: 0, normalized: { request: body(ticket), standardized: false, source: "raw" }, library: 0, tier: "explored" };
  }
  const n = await normalize(body(ticket));
  const normalized = n.standardized ? n : { ...n, request: body(ticket) };

  // Tier 1: compiled plan, matched on the canonical primary goal (operation + subject). A plan serves only after it
  // graduated in shadow: run next to the agent on 3 matching tickets, promoted when >= 2 agree with the agent.
  const cm = await compiled();
  const task = cm?.toTask && normalized.standardized ? cm.toTask(normalized, ticket) : null;
  const plan = task ? planFor(cm, task) : undefined;
  if (plan && shadowState(plan.id).promoted) {
    const c = await cm.execute(plan, task, ticket).catch(() => null);
    if (c) return { ...c, ticket, recalled: false, similarity: 1, normalized, library: (await load()).length, tier: "compiled", planId: c.planId };
  }

  // Tier 2: recalled path. Tier 3: explore.
  const r: Recalled = opts.recall === false || !normalized.standardized
    ? { similarity: 0, embedding: [], backend: "none" }
    : await recall(normalized.request, normalized.signature);
  const hit = r.procedure && r.similarity >= recallThreshold(r.backend) ? r.procedure : undefined;
  const done = hit ? prefetch(ticket, hit) : [];
  const t = hit
    ? await handleTicket(ticket, hintFor(hit, r.similarity, done), { tools: replayTools(hit), effort: REPLAY_EFFORT })
    : await handleTicket(ticket);
  const trace: Trace = { ...t, steps: [...done, ...t.steps] };

  // Library hygiene: a new procedure only when nothing matched, or when the recalled one was abandoned under a
  // different key. A matched path is reinforced (uses++); an abandoned same-key path is rewritten in place.
  let learned: string | undefined, reinforced: string | undefined, revised: string | undefined;
  const abandoned = !!hit && abandonedPath(hit, t.steps);
  if (opts.learn !== false && succeeded(trace) && normalized.standardized) {
    const sameKey = hit && hit.key && hit.key === normalized.request;
    if (!hit || (abandoned && !sameKey)) {
      const saved = await saveProcedure({ sessionId: opts.id ?? "adhoc", normalized, steps: trace.steps, ticket: body(ticket), embedding: r.embedding, goldIntent: opts.goldIntent }).catch(() => undefined);
      if (saved?.created) learned = saved.procedure!.id;
      else if (saved?.procedure) reinforced = saved.procedure.id;
    } else if (abandoned) {
      Object.assign(hit, toPath(trace.steps), { tools: [...new Set(trace.steps.map((s) => s.tool))], revisions: (hit.revisions ?? 0) + 1 });
      revised = hit.id;
      persist();
    } else {
      hit.uses = (hit.uses ?? 0) + 1;
      for (const tool of new Set(trace.steps.map((s) => s.tool))) if (!hit.tools.includes(tool) && LOOKUPS.has(tool)) hit.tools.push(tool);
      reinforced = hit.id;
      persist();
      if (cm?.maybeCompile && hit.intent) {
        const np = await cm.maybeCompile(hit, trace).catch(() => undefined);
        if (np) { np.enabled = false; np.shadowPending = true; cm.savePlan(np); shadows.set(np.id, { trials: 0, agree: 0, promoted: false, rejected: false }); }
      }
    }
  }
  let shadow: Solved["shadow"], shadowCost = 0;
  if (plan && !shadowState(plan.id).promoted && !shadowState(plan.id).rejected && succeeded(trace)) {
    const r2 = await runShadow(cm, plan, task, ticket, trace).catch(() => undefined);
    if (r2) ({ shadow, cost: shadowCost } = r2);
  }
  return {
    ...trace, recalled: !!hit, procedureId: hit?.id, procedureTitle: hit?.title, procedureIntent: hit?.goldIntent ?? hit?.intent, procedureTools: hit ? [...hit.tools] : undefined,
    similarity: r.similarity, normalized, learned, reinforced, revised, abandoned, library: (await load()).length,
    tier: hit ? "recalled" : "explored", backend: r.backend, shadow, shadowCost,
  };
}
