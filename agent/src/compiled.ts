// Third tier: compiled paths. A learned path that has been reused successfully N times becomes a deterministic JSON
// plan (replay/plans/*.json) that runs with NO model call: bind entities → run tools → check guards → render reply.
// Any missing binding, failed guard or unknown value returns null, and the ticket falls back to recall/explore.
// Plans may take write actions only when every decision is a deterministic rule over tool outputs + GBrain policy
// (risk: "write"; each compiled write is logged to replay/compiled-writes.jsonl with the guards it passed).
import Anthropic from "@anthropic-ai/sdk";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readPage, searchKb } from "./brain";
import * as shop from "./shop";

const ROOT = join(import.meta.dir, "../..");
export const PLANS_DIR = process.env.PLANS_DIR ?? join(ROOT, "replay/plans");
const WRITES_LOG = join(ROOT, "replay/compiled-writes.jsonl");
export const MIN_USES = Number(process.env.COMPILE_MIN_USES ?? 3);
const MODEL = process.env.SUPPORT_MODEL ?? "claude-opus-5"; // compile time only (reply template draft)

// ---------- plan schema ----------
export type Ref = string; // "$.bind.email" | "$.s.<stepId>.a.b.0" | "$.ticket" | "$.topic" | literal
export type Guard = { ref: Ref; op: "eq" | "ne" | "in" | "exists" | "true" | "len_eq"; value?: unknown; why: string };
export type PlanStep = { id: string; tool: string; args: Record<string, Ref | number | boolean>; write?: boolean; guards?: Guard[] };
export type Plan = {
  id: string; version: 1; risk: "read" | "write";
  match: { operation: string; subject: string; topic?: string; key?: string; outputs?: string[] }; // canonical v1 fields (+ stand-in key)
  requires: string[]; // entity bindings needed: email | order_id | address
  steps: PlanStep[];
  reply: string; // template with {{s.step.path}} / {{bind.x}} refs, filters |first |money
  source: { procedureId: string; intent?: string; uses: number; examples: number; replyTemplate: "model" | "fallback"; note?: string };
  compiledAt: string;
  // Offline validation (replay/compile_eval.ts). A plan only serves traffic when enabled !== false.
  validation?: { tested: number; compiled: number; correct: number; precision: number | null }; enabled?: boolean;
};

// ---------- canonical v1 (River) or stand-in → task ----------
// Haiku stand-in emits an ABCD subflow label; this table renders it into v1 operation/subject (fallback until River).
const INTENT_V1: Record<string, { operation: string; subject: string }> = {
  refund_status: { operation: "retrieve", subject: "refund" }, refund_update: { operation: "retrieve", subject: "refund" },
  refund_initiate: { operation: "request", subject: "refund" },
  status: { operation: "retrieve", subject: "delivery" }, status_delivery_time: { operation: "retrieve", subject: "delivery" },
  status_quantity: { operation: "retrieve", subject: "delivery" }, manage: { operation: "request", subject: "delivery" },
  cost: { operation: "assess", subject: "delivery" }, missing: { operation: "troubleshoot", subject: "delivery" },
  manage_cancel: { operation: "request", subject: "cancellation" },
  return_size: { operation: "request", subject: "return" }, return_color: { operation: "request", subject: "return" }, return_stain: { operation: "request", subject: "return" },
  recover_password: { operation: "request", subject: "account" }, recover_username: { operation: "retrieve", subject: "account" }, reset_2fa: { operation: "request", subject: "account" },
  promo_code_invalid: { operation: "troubleshoot", subject: "promo_code" }, promo_code_out_of_date: { operation: "troubleshoot", subject: "promo_code" },
  bad_price_yesterday: { operation: "assess", subject: "pricing" }, bad_price_competitor: { operation: "request", subject: "pricing" },
  status_active: { operation: "retrieve", subject: "subscription" }, status_due_date: { operation: "retrieve", subject: "subscription" }, status_due_amount: { operation: "retrieve", subject: "subscription" },
  status_mystery_fee: { operation: "assess", subject: "order" }, status_payment_method: { operation: "retrieve", subject: "order" },
  status_shipping_question: { operation: "assess", subject: "delivery" }, manage_change_address: { operation: "request", subject: "address" },
  timing: { operation: "explain", subject: "policy" }, policy: { operation: "explain", subject: "policy" }, pricing: { operation: "explain", subject: "policy" }, membership: { operation: "explain", subject: "policy" },
  jeans: { operation: "explain", subject: "product_information" }, jacket: { operation: "explain", subject: "product_information" },
  boots: { operation: "explain", subject: "product_information" }, shirt: { operation: "explain", subject: "product_information" },
  shopping_cart: { operation: "troubleshoot", subject: "site" }, credit_card: { operation: "troubleshoot", subject: "site" },
};
const FAQ_TOPICS = new Set(["timing", "policy", "pricing", "membership", "jeans", "jacket", "boots", "shirt"]);

type Task = { operation: string; subject: string; topic?: string; key?: string; outputs?: string[]; bindings: Record<string, string> };
/** Accepts memory.ts `Normalized` ({request, intent, canonical}), a raw canonical v1 object, or nothing (derive from ticket). */
export function toTask(input: any, ticket: string): Task | null {
  const canonical = input?.canonical ?? (input?.version === 1 ? input : undefined);
  const bindings: Record<string, string> = {};
  if (canonical?.tasks) { // River canonical v1
    if (canonical.unresolved?.length || canonical.tasks.length !== 1) return null; // contract: unresolved/multi-task → normal solving
    const t = canonical.tasks[0];
    for (const e of Object.values<any>(canonical.entities ?? {})) Object.assign(bindings, e.bindings ?? {});
    const topic = canonical.entities?.[t.target]?.attributes?.topic;
    return { operation: t.operation, subject: t.subject, outputs: t.outputs, topic, key: input?.request, bindings: withTicket(bindings, ticket) };
  }
  const intent = input?.intent ?? canonical?.intent;
  if (intent && INTENT_V1[intent]) return { ...INTENT_V1[intent]!, topic: intent, key: input?.request, bindings: withTicket(bindings, ticket) };
  // Minimal fallback without any normalizer: regex-derived task for the two highest-volume read flows only.
  const t = ticket.toLowerCase();
  if (/refund/.test(t) && /status|where|update|check|when/.test(t)) return { operation: "retrieve", subject: "refund", topic: "refund_status", bindings: withTicket(bindings, ticket) };
  return null;
}
function withTicket(b: Record<string, string>, ticket: string) {
  const email = b.email ?? ticket.match(/(?:from:?\s*)?([\w.+-]+@[\w-]+\.[\w.]+)/i)?.[1];
  const order = b.order_id ?? ticket.match(/\b(\d{10})\b/)?.[1];
  return { ...b, ...(email ? { email: email.toLowerCase() } : {}), ...(order ? { order_id: order } : {}) };
}

// ---------- tools a plan may call (read tools + deterministic write tools) ----------
const READ = new Set(["pull_up_account", "verify_identity", "validate_purchase", "find_orders", "shipping_status", "check_system", "membership", "subscription_status", "get_refunds", "list_products", "search_kb", "read_page", "pick_order", "select_faq", "policy_check"]);
const WRITE = new Set(["offer_refund", "update_order", "promo_code", "make_password", "record_reason", "enter_details", "send_link", "troubleshoot_step"]);

const RETURN_DAYS: Record<string, number> = { gold: 1e9, silver: 180, bronze: 90, guest: 30 }; // policies/membership
const TODAY = "2026-09-27";

async function runTool(tool: string, a: any, ctx: Ctx): Promise<unknown> {
  switch (tool) {
    case "pull_up_account": return shop.pullUpAccount(a);
    case "verify_identity": return shop.verifyIdentity(a);
    case "validate_purchase": return shop.validatePurchase(a);
    case "find_orders": return shop.findOrders(a);
    case "shipping_status": return shop.shippingStatus(a.orderId);
    case "check_system": return shop.checkSystem(a);
    case "membership": return shop.membership(a);
    case "subscription_status": return shop.subscriptionStatus(a.email);
    case "get_refunds": return shop.getRefunds(a);
    case "list_products": return shop.listProducts();
    case "search_kb": return searchKb(a.query);
    case "read_page": return readPage(a.slug);
    // Local deterministic steps.
    case "pick_order": { // bound order id if it is the customer's; else their only order; else the only one with a refund
      const ids: string[] = (a.orders ?? []).map((o: any) => o.id);
      const id = a.orderId && ids.includes(a.orderId) ? a.orderId : ids.length === 1 ? ids[0]
        : a.preferRefunded ? (() => { const r = ids.filter((i) => shop.getRefunds({ orderId: i }).length); return r.length === 1 ? r[0] : undefined; })() : undefined;
      return id ? shop.findOrders({ orderId: id })[0] ?? null : null;
    }
    case "select_faq": return selectFaq(String(a.page ?? ""), ctx.ticket);
    case "policy_check": { // GBrain policy as a rule: returns window by membership level; cancellation only before shipping
      const days = Math.round((Date.parse(TODAY) - Date.parse(a.placedAt)) / 864e5);
      if (a.rule === "return_window") return { ok: days <= (RETURN_DAYS[a.level] ?? 30), days, limit: RETURN_DAYS[a.level] ?? 30, level: a.level };
      if (a.rule === "not_shipped") return { ok: a.status === "processing", status: a.status };
      if (a.rule === "promo_allowed") return { ok: a.level !== "guest" && a.answer === "yes", level: a.level, answer: a.answer };
      return { ok: false };
    }
    case "offer_refund": return shop.offerRefund(a);
    case "update_order": return shop.updateOrder(a.orderId, a.change, a.value, a.amount);
    case "promo_code": return shop.promoCode(a.email, a.reason, a.percent);
    case "make_password": return shop.makePassword(a);
    case "record_reason": return shop.recordReason(a);
    case "enter_details": return shop.enterDetails(a);
    case "send_link": return shop.sendLink(a.email, a.kind);
    case "troubleshoot_step": return shop.troubleshootStep(a.email, a.step);
  }
  throw new Error(`tool not allowed in a compiled plan: ${tool}`);
}

const STOP = new Set("the a an i my is are was to of for and or in on it be can you do does what how your me with this that at have has will would please hi hello thanks thank".split(" "));
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ing|es|s)$/, ""));
function selectFaq(page: string, ticket: string) {
  const items = [...page.matchAll(/^- \*\*(.+?):\*\* (.+)$/gm)].map((m) => ({ question: m[1]!, answer: m[2]! }));
  const t = new Set(words(ticket));
  const scored = items.map((it) => ({ ...it, score: words(it.question).filter((w) => t.has(w)).length * 2 + words(it.answer).filter((w) => t.has(w)).length }));
  scored.sort((x, y) => y.score - x.score);
  const best = scored[0];
  const unique = !!best && best.score > 0 && (scored[1]?.score ?? 0) < best.score;
  return { found: unique, question: best?.question, answer: best?.answer?.replace(/\s*\(`[^`]+`\)/g, ""), score: best?.score };
}

// ---------- refs, guards, templates ----------
type Ctx = { bind: Record<string, string>; s: Record<string, any>; ticket: string; topic?: string };
function get(ctx: Ctx, ref: unknown): unknown {
  if (typeof ref !== "string" || !ref.startsWith("$.")) return ref;
  let v: any = ctx;
  for (const k of ref.slice(2).split(".")) { if (v == null) return undefined; v = v[k]; }
  return v;
}
function check(g: Guard, ctx: Ctx) {
  const v = get(ctx, g.ref);
  switch (g.op) {
    case "exists": return v !== undefined && v !== null && v !== "";
    case "true": return v === true;
    case "eq": return v === g.value;
    case "ne": return v !== g.value;
    case "in": return Array.isArray(g.value) && g.value.includes(v);
    case "len_eq": return Array.isArray(v) && v.length === g.value;
  }
}
const FILTERS: Record<string, (v: any) => string> = {
  first: (v) => String(v ?? "").split(" ")[0]!.replace(/^./, (c) => c.toUpperCase()),
  money: (v) => `$${Number(v).toFixed(Number(v) % 1 ? 2 : 0)}`,
  list: (v) => (Array.isArray(v) ? v.map((x) => (typeof x === "object" ? x.name ?? JSON.stringify(x) : x)).join(", ") : String(v)),
};
export function render(tpl: string, ctx: Ctx): string | null {
  let missing = false;
  const out = tpl.replace(/\{\{\s*([\w.]+)(?:\|(\w+))?\s*\}\}/g, (_, ref: string, f?: string) => {
    const v = get(ctx, `$.${ref}`);
    if (v === undefined || v === null || v === "" || (typeof v === "object" && !Array.isArray(v))) { missing = true; return ""; }
    return f && FILTERS[f] ? FILTERS[f]!(v) : Array.isArray(v) ? FILTERS.list!(v) : String(v);
  });
  return missing ? null : out;
}

// ---------- plan store ----------
let cache: Plan[] | undefined;
export function loadPlans(): Plan[] {
  if (cache) return cache;
  if (!existsSync(PLANS_DIR)) return (cache = []);
  return (cache = readdirSync(PLANS_DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(PLANS_DIR, f), "utf8"))));
}
export function savePlan(p: Plan) {
  mkdirSync(PLANS_DIR, { recursive: true });
  writeFileSync(join(PLANS_DIR, `${p.id}.json`), JSON.stringify(p, null, 2) + "\n");
  cache = [...loadPlans().filter((x) => x.id !== p.id), p];
}
export function findPlan(task: Task): Plan | undefined {
  const plans = loadPlans().filter((p) => p.enabled !== false);
  if (task.key) { const k = plans.find((p) => p.match.key === task.key); if (k) return k; }
  const same = plans.filter((p) => p.match.operation === task.operation && p.match.subject === task.subject);
  if (task.topic) return same.find((p) => p.match.topic === task.topic);
  return same.length === 1 ? same[0] : undefined; // River v1 without a topic: only an unambiguous op/subject match
}

// ---------- execute ----------
export type CompiledTrace = { ticket: string; steps: { tool: string; input: unknown; output: unknown }[]; reply: string; ms: number; inputTokens: 0; outputTokens: 0; modelCalls: 0; compiled: true; planId: string; risk: Plan["risk"] };
export let lastFallback = ""; // why the most recent tryCompiled returned null (debug / Paths panel)

export async function execute(plan: Plan, task: Pick<Task, "bindings" | "topic">, ticket: string, opts: { dryRun?: boolean } = {}): Promise<CompiledTrace | null> {
  const started = Date.now();
  const ctx: Ctx = { bind: task.bindings, s: {}, ticket, topic: plan.match.topic };
  for (const r of plan.requires) if (!ctx.bind[r]) return fail(`missing binding ${r}`);
  const steps: CompiledTrace["steps"] = [];
  const writes: { step: string; tool: string; input: unknown; guards: string[] }[] = [];
  for (const st of plan.steps) {
    // Every guard written for this step must hold on current evidence BEFORE a write runs (pre-guards) …
    if (st.write) for (const g of st.guards ?? []) if (!check(g, ctx)) return fail(`${st.id}: ${g.why}`);
    const input = Object.fromEntries(Object.entries(st.args).map(([k, v]) => [k, get(ctx, v)]).filter(([, v]) => v !== undefined));
    if (opts.dryRun && st.write) { ctx.s[st.id] = { ok: true, dryRun: true }; continue; }
    let output: unknown;
    try { output = await runTool(st.tool, input, ctx); } catch (e) { return fail(`${st.id}: ${e}`); }
    ctx.s[st.id] = output;
    if (!["pick_order", "select_faq", "policy_check"].includes(st.tool)) steps.push({ tool: st.tool, input, output });
    if (st.write) writes.push({ step: st.id, tool: st.tool, input, guards: (st.guards ?? []).map((g) => g.why) });
    // … and read steps' guards are checked on their own output (post-guards).
    else for (const g of st.guards ?? []) if (!check(g, ctx)) return fail(`${st.id}: ${g.why}`);
  }
  const reply = render(plan.reply, ctx);
  if (!reply) return fail("reply template has unresolved refs");
  for (const w of writes) try { appendFileSync(WRITES_LOG, JSON.stringify({ at: new Date().toISOString(), plan: plan.id, ...w }) + "\n"); } catch {}
  lastFallback = "";
  return { ticket, steps, reply, ms: Date.now() - started, inputTokens: 0, outputTokens: 0, modelCalls: 0, compiled: true, planId: plan.id, risk: plan.risk };
}
function fail(why: string) { lastFallback = why; return null; }

/** Single integration point: normalized request (River v1 canonical or stand-in) + raw ticket → compiled trace or null. */
export async function tryCompiled(canonical: unknown, ticket: string): Promise<CompiledTrace | null> {
  if (process.env.COMPILED === "off") return null;
  const task = toTask(canonical, ticket);
  if (!task) return fail("no canonical task");
  const plan = findPlan(task);
  if (!plan) return fail("no plan");
  return execute(plan, task, ticket);
}

// ---------- compile ----------
export type ProcedureLike = { id: string; key?: string; intent?: string; goldIntent?: string; uses?: number; path?: string[]; tools?: string[] };
const ORDER_TOOLS = new Set(["verify_identity", "validate_purchase", "shipping_status", "get_refunds", "offer_refund", "update_order", "policy_check"]);
const Q: Record<string, string> = {}; // oracle question per topic (deterministic key for check_system)
const question = (topic: string) => (Q[topic] ??= `Is the customer's ${topic.replace(/_/g, " ")} claim a company error?`);

/** Step skeleton for one learned tool, or a string reason when the tool's decision is not deterministic. */
function stepFor(tool: string, topic: string, have: Set<string>): PlanStep[] | string {
  const email = "$.bind.email", order = "$.s.pick_order.id", acct = "$.s.pull_up_account.account";
  switch (tool) {
    case "pull_up_account": return [{ id: tool, tool, args: { email }, guards: [{ ref: "$.s.pull_up_account.found", op: "true", why: "account found" }] }];
    case "verify_identity": return [{ id: tool, tool, args: { name: `${acct}.name`, accountId: `${acct}.accountId`, orderId: order }, guards: [{ ref: "$.s.verify_identity.verified", op: "true", why: "identity verified" }] }];
    case "validate_purchase": return [{ id: tool, tool, args: { username: `${acct}.username`, email, orderId: order }, guards: [{ ref: "$.s.validate_purchase.valid", op: "true", why: "purchase valid" }] }];
    case "find_orders": return [{ id: tool, tool, args: { email } }];
    case "shipping_status": return [{ id: tool, tool, args: { orderId: order }, guards: [{ ref: "$.s.shipping_status.ok", op: "true", why: "order found" }] }];
    case "get_refunds": return [{ id: tool, tool, args: { orderId: order }, guards: [{ ref: "$.s.get_refunds", op: "len_eq", value: 1, why: "exactly one refund on the order" }] }];
    case "check_system": return [{ id: tool, tool, args: { email, orderId: order, question: question(topic) } }];
    case "membership": return [{ id: tool, tool, args: { email } }];
    case "subscription_status": return [{ id: tool, tool, args: { email }, guards: [{ ref: "$.s.subscription_status.ok", op: "true", why: "subscription found" }] }];
    case "list_products": return [];
    case "record_reason": return [{ id: tool, tool, write: true, args: { email, orderId: have.has("order") ? order : "-", reason: topic.replace(/_/g, " ") } }];
    case "enter_details": return [{ id: tool, tool, write: true, args: { email, orderId: have.has("order") ? order : "-", details: topic.replace(/_/g, " ") } }];
    case "make_password": return [{ id: tool, tool, write: true, args: { email }, guards: [{ ref: "$.s.pull_up_account.found", op: "true", why: "account found" }] }];
    case "send_link": return [{ id: tool, tool, write: true, args: { email, kind: topic.replace(/_/g, " ") }, guards: [{ ref: "$.s.pull_up_account.found", op: "true", why: "account found" }] }];
    case "troubleshoot_step": return [{ id: tool, tool, write: true, args: { email, step: "log out and back in, clear cache, try again" } }];
    case "promo_code": {
      const pre: PlanStep[] = [];
      if (!have.has("membership")) pre.push({ id: "membership", tool: "membership", args: { email } });
      if (!have.has("check_system")) pre.push({ id: "check_system", tool: "check_system", args: { email, question: question(topic) } });
      return [...pre, { id: "promo_rule", tool: "policy_check", args: { rule: "promo_allowed", level: "$.s.membership.level", answer: "$.s.check_system.answer" } },
        { id: tool, tool, write: true, args: { email, reason: topic.replace(/_/g, " "), percent: 10 }, guards: [{ ref: "$.s.promo_rule.ok", op: "true", why: "policies/membership: level may get a new code and system confirms company error" }] }];
    }
    case "offer_refund": {
      const pre: PlanStep[] = have.has("membership") ? [] : [{ id: "membership", tool: "membership", args: { email } }];
      const cancel = topic === "manage_cancel";
      const rule: PlanStep = cancel
        ? { id: "refund_rule", tool: "policy_check", args: { rule: "not_shipped", status: "$.s.pick_order.status" } }
        : { id: "refund_rule", tool: "policy_check", args: { rule: "return_window", level: "$.s.membership.level", placedAt: "$.s.pick_order.placedAt" } };
      const steps: PlanStep[] = [...pre, rule];
      if (cancel) steps.push({ id: "cancel", tool: "update_order", write: true, args: { orderId: order, change: "cancel order", value: "customer request" }, guards: [{ ref: "$.s.refund_rule.ok", op: "true", why: "order not shipped yet (cancellation policy)" }] });
      else steps.push({ id: tool, tool, write: true, args: { orderId: order, amount: "$.s.pick_order.total", method: "credit card", reason: topic.replace(/_/g, " ") }, guards: [{ ref: "$.s.refund_rule.ok", op: "true", why: "within membership return window (policies/membership)" }, { ref: "$.s.pick_order.status", op: "eq", value: "delivered", why: "item delivered" }] });
      return steps;
    }
  }
  return `no deterministic rule for ${tool}`;
}

export type CompileResult = { plan?: Plan; reason?: string };
/** Compile a recalled procedure into a plan. `examples`: successful {ticket, reply} pairs for the reply template. */
export async function compile(proc: ProcedureLike, examples: { ticket: string; reply: string }[], opts: { minUses?: number; aggregateUses?: number; save?: boolean } = {}): Promise<CompileResult> {
  const uses = opts.aggregateUses ?? proc.uses ?? 0;
  if (uses < (opts.minUses ?? MIN_USES)) return { reason: `only ${uses} successful reuses` };
  const topic = proc.intent ?? proc.goldIntent ?? "";
  const v1 = INTENT_V1[topic];
  if (!v1) return { reason: `topic ${topic} not in canonical vocabulary` };
  let tools = [...new Set((proc.path ?? []).map((p) => p.split(" ")[0]!).concat(proc.tools ?? []))].filter((t) => t !== "search_kb" && t !== "read_page");
  let note: string | undefined;
  if (FAQ_TOPICS.has(topic)) { tools = ["faq"]; note = "FAQ family: steps from GBrain procedure (read_page faq/<topic> → select-faq)"; }
  const steps: PlanStep[] = [];
  const have = new Set<string>();
  const add = (s: PlanStep[]) => { for (const x of s) { if (have.has(x.id)) continue; steps.push(x); have.add(x.id); } };
  for (const t of tools) {
    if (t === "faq") {
      add([{ id: "read_page", tool: "read_page", args: { slug: `faq/${topic}` } },
        { id: "select_faq", tool: "select_faq", args: { page: "$.s.read_page" }, guards: [{ ref: "$.s.select_faq.found", op: "true", why: "exactly one FAQ answer matches the question" }] }]);
      continue;
    }
    if (t === "update_order" && have.has("check_system")) { // conditional fix after the oracle → deterministic fallback guard
      steps.find((s) => s.id === "check_system")!.guards = [{ ref: "$.s.check_system.answer", op: "eq", value: "no", why: "system reports no company error (else an order fix is needed → agent)" }];
      continue;
    }
    if (ORDER_TOOLS.has(t) || (t === "offer_refund")) if (!have.has("pick_order")) {
      if (!have.has("pull_up_account")) add(stepFor("pull_up_account", topic, have) as PlanStep[]);
      add([{ id: "pick_order", tool: "pick_order", args: { orders: "$.s.pull_up_account.account.orders", orderId: "$.bind.order_id", preferRefunded: v1.subject === "refund" }, guards: [{ ref: "$.s.pick_order.id", op: "exists", why: "one unambiguous order" }] }]);
      have.add("order");
    }
    const s = stepFor(t, topic, have);
    if (typeof s === "string") return { reason: s };
    add(s);
  }
  if (!steps.length) return { reason: "empty path" };
  const risk: Plan["risk"] = steps.some((s) => s.write) ? "write" : "read";
  const plan: Plan = {
    id: `plan-${topic.replace(/_/g, "-")}`, version: 1, risk,
    match: { ...v1, topic, key: proc.key }, requires: FAQ_TOPICS.has(topic) ? [] : ["email"], steps, reply: "",
    source: { procedureId: proc.id, intent: topic, uses, examples: examples.length, replyTemplate: "fallback", note }, compiledAt: new Date().toISOString(),
  };
  // Sample context: dry-run the steps on the first example ticket (writes skipped) to show the template writer real values.
  let sample: Ctx | undefined;
  for (const ex of examples.slice(0, 5)) { sample = await sampleCtx(plan, ex.ticket); if (sample) break; }
  plan.reply = fallbackReply(plan);
  if (sample && examples.length) {
    const t = await draftTemplate(plan, sample, examples).catch(() => undefined);
    if (t && render(t, sample)) { plan.reply = t; plan.source.replyTemplate = "model"; }
  }
  if (opts.save !== false) savePlan(plan);
  return { plan };
}

async function sampleCtx(plan: Plan, ticket: string): Promise<Ctx | undefined> {
  const task = toTask(undefined, ticket) ?? { bindings: withTicket({}, ticket) };
  const ctx: Ctx = { bind: task.bindings, s: {}, ticket, topic: plan.match.topic };
  for (const st of plan.steps) {
    const input = Object.fromEntries(Object.entries(st.args).map(([k, v]) => [k, get(ctx, v)]));
    if (st.write) { ctx.s[st.id] = SAMPLE_WRITE[st.tool] ?? { ok: true }; continue; }
    try { ctx.s[st.id] = await runTool(st.tool, input, ctx); } catch { return; }
  }
  return ctx.s.pull_up_account?.found === false ? undefined : ctx;
}
const SAMPLE_WRITE: Record<string, unknown> = {
  offer_refund: { ok: true, refundId: "RF-1", amount: 64, method: "credit card" }, update_order: { ok: true, change: "cancel order" },
  promo_code: { ok: true, code: "NW10-ABC", percent: 10, expires: "2026-10-04" }, make_password: { ok: true, temporaryPassword: "nw-123456", username: "user1" },
  send_link: { ok: true, sentTo: "x@example.com", kind: "link" }, record_reason: { ok: true }, enter_details: { ok: true }, troubleshoot_step: { ok: true },
};

function flatten(v: unknown, prefix: string, out: Record<string, unknown>, depth = 0) {
  if (depth > 4 || out.__n && (out.__n as number) > 120) return;
  if (v && typeof v === "object" && !Array.isArray(v)) for (const [k, x] of Object.entries(v)) flatten(x, `${prefix}.${k}`, out, depth + 1);
  else if (Array.isArray(v) && v.length && typeof v[0] === "object") v.slice(0, 2).forEach((x, i) => flatten(x, `${prefix}.${i}`, out, depth + 1));
  else { out[prefix] = typeof v === "string" && v.length > 160 ? v.slice(0, 160) + "…" : v; out.__n = ((out.__n as number) ?? 0) + 1; }
}

async function draftTemplate(plan: Plan, sample: Ctx, examples: { ticket: string; reply: string }[]) {
  const refs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(sample.s)) if (!["read_page", "search_kb"].includes(k)) flatten(v, `s.${k}`, refs);
  delete refs.__n;
  const client = new Anthropic();
  const r = await client.messages.create({
    model: MODEL, max_tokens: 1500,
    system: "You write reply templates for a deterministic customer-support program (no model at run time). Output ONLY the template text.",
    messages: [{ role: "user", content: `Request type: ${plan.match.topic} (${plan.match.operation} ${plan.match.subject}). The program ran these steps: ${plan.steps.map((s) => s.id).join(" → ")}${plan.risk === "write" ? " (write steps succeed only when their policy guards passed)" : ""}.
Successful agent replies for this request type:
${examples.slice(0, 3).map((e, i) => `--- ${i + 1}. Ticket: ${e.ticket.slice(0, 300)}\nReply: ${e.reply.slice(0, 700)}`).join("\n")}

Available refs with sample values (use as {{ref}}; filters: |first for a first name, |money for amounts):
${JSON.stringify(refs, null, 1).slice(0, 5000)}

Write one short, friendly reply template that is correct for ANY ticket of this type. Use only refs listed above that are always present for this path; never invent facts that are not refs; no conditionals, no placeholders other than {{refs}}. End by asking if they need anything else.` }],
  });
  return r.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
}

function fallbackReply(plan: Plan): string {
  const ids = new Set(plan.steps.map((s) => s.id));
  const hi = ids.has("pull_up_account") ? "Hi {{s.pull_up_account.account.name|first}}, " : "Hi, ";
  if (ids.has("select_faq")) return `${hi}thanks for asking! {{s.select_faq.question}}: {{s.select_faq.answer}} Is there anything else I can help you with?`;
  const parts: string[] = [];
  if (ids.has("get_refunds")) parts.push("your refund for order {{s.pick_order.id}} ({{s.get_refunds.0.amount|money}}) is {{s.get_refunds.0.status}} back to your {{s.get_refunds.0.method}}.");
  else if (ids.has("shipping_status")) parts.push("I checked order {{s.pick_order.id}} ({{s.pick_order.items}}): it is {{s.shipping_status.shippingStatus}}, shipping to {{s.pick_order.shipTo}}.");
  else if (ids.has("pick_order")) parts.push("I checked order {{s.pick_order.id}} ({{s.pick_order.items}}) and everything is in order.");
  if (ids.has("offer_refund")) parts.push("I've refunded {{s.offer_refund.amount|money}} to your {{s.offer_refund.method}}.");
  if (ids.has("cancel")) parts.push("I've cancelled the order; the refund goes back to your original payment method.");
  if (ids.has("promo_code")) parts.push("Here is a new promo code: {{s.promo_code.code}} ({{s.promo_code.percent}}% off, valid until {{s.promo_code.expires}}).");
  if (ids.has("make_password")) parts.push("Your temporary password is {{s.make_password.temporaryPassword}}; please change it at your next login.");
  if (ids.has("send_link")) parts.push("I've emailed you the link at {{s.send_link.sentTo}}.");
  if (ids.has("subscription_status")) parts.push("Your {{s.subscription_status.plan}} subscription is {{s.subscription_status.status}}; {{s.subscription_status.dueAmount|money}} is due on {{s.subscription_status.dueDate}}.");
  if (!parts.length) parts.push("I've looked into your account and noted your request.");
  return `${hi}${parts.join(" ")} Is there anything else I can help you with?`;
}

// ---------- online compilation ----------
const seen = new Map<string, { ticket: string; reply: string }[]>();
const failedCompile = new Set<string>();
/** Call after each successful recalled ticket: once the procedure has MIN_USES reuses, compile it (one model call, compile time only). */
export async function maybeCompile(proc: ProcedureLike, trace: { ticket: string; reply: string }): Promise<Plan | undefined> {
  const ex = seen.get(proc.id) ?? [];
  if (trace.reply) ex.push({ ticket: trace.ticket, reply: trace.reply });
  seen.set(proc.id, ex.slice(-5));
  if ((proc.uses ?? 0) < MIN_USES || failedCompile.has(proc.id)) return;
  if (loadPlans().some((p) => p.source.procedureId === proc.id || (proc.key && p.match.key === proc.key))) return;
  const r = await compile(proc, ex);
  if (!r.plan) failedCompile.add(proc.id);
  return r.plan;
}
