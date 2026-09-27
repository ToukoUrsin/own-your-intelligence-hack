// Canonical request v1 (CANONICAL_REQUEST_V1.md, Marc/River): validator, field registry and deterministic renderer,
// plus a Haiku stand-in for River that emits the same structure. The rendered sentence is what recall matches on.
// No intents, workflow ids or tools here; subflow labels exist only in the evaluation.
import Anthropic from "@anthropic-ai/sdk";

export const OPERATIONS = ["retrieve", "explain", "assess", "troubleshoot", "request"] as const;
// v1 subjects plus the demo domain's (clothing retailer) seeds, per "seed this registry from the demo domain".
export const SUBJECTS = [
  "delivery", "refund", "return", "cancellation", "replacement", "product_issue", "product_information", "policy", "subscription", "address",
  "account_access", "account_details", "payment_method", "billing", "promo_code", "price", "order_items", "shipping_method", "shipping_cost",
  "membership", "website", "stock", "order",
] as const;
const KINDS = ["order", "product", "refund", "subscription", "account", "policy", "address", "promo_code", "website"] as const;
const OUTPUTS = ["status", "estimated_arrival", "amount", "due_date", "eligibility", "reason", "instructions", "availability", "price", "details", "credentials"] as const;
const FIELDS = [
  "received", "delivered", "shipped", "charged", "fee_unexpected", "size_correct", "color_correct", "stained", "damaged", "working", "expired", "valid",
  "in_stock", "cheaper_elsewhere", "price_dropped", "returned", "bought", "item_missing", "can_log_in", "remembers_username", "remembers_password",
  "has_2fa_access", "slow", "search_works", "cart_works", "card_accepted", "credit_applied", "service_added", "service_removed", "quantity_correct",
] as const;
const ATTRIBUTES = ["product_type", "product_line", "shipping_speed", "membership_level", "payment_method"] as const;
const OPS = ["eq", "ne", "lt", "lte", "gt", "gte", "contains"] as const;

type Pred = { target: string; field: string; op: string; value: unknown };
type Expr = Pred | { all: Expr[] } | { any: Expr[] } | { not: Expr };
type Task = { id: string; operation: string; subject: string; target?: string; outputs: string[]; reported: Expr[]; conditions: Expr[]; prohibitions: { operation: string; subject: string; target?: string }[]; depends_on: string[] };
export type Canonical = { version: 1; tasks: Task[]; entities: Record<string, { kind: string; bindings: Record<string, string>; attributes: Record<string, string> }>; unresolved: { kind: string; quote?: string; detail?: string }[] };

const has = (list: readonly string[], v: unknown): v is string => typeof v === "string" && list.includes(v);
const words = (s: string) => s.replace(/_/g, " ");

// Validate: unknown operation/subject/kind → invalid (goes to normal solving). Unknown outputs, predicate fields and
// attributes are dropped and counted, since Haiku is only a stand-in for a trained River model.
export function validate(x: any): { ok: boolean; canonical?: Canonical; dropped: number; why?: string } {
  let dropped = 0;
  if (!x || x.version !== 1 || !Array.isArray(x.tasks) || !x.tasks.length) return { ok: false, dropped, why: "structure" };
  const entities: Canonical["entities"] = {};
  for (const [id, e] of Object.entries<any>(x.entities ?? {})) {
    if (!has(KINDS, e?.kind)) return { ok: false, dropped, why: `kind ${e?.kind}` };
    const attributes: Record<string, string> = {};
    for (const [k, v] of Object.entries<any>(e.attributes ?? {})) if (has(ATTRIBUTES, k) && (typeof v === "string" || typeof v === "number")) attributes[k] = String(v).toLowerCase(); else dropped++;
    entities[id] = { kind: e.kind, bindings: e.bindings ?? {}, attributes };
  }
  const pred = (p: any): Expr | undefined => {
    if (p?.all || p?.any) { const xs = (p.all ?? p.any).map(pred).filter(Boolean); return xs.length ? (p.all ? { all: xs } : { any: xs }) : undefined; }
    if (p?.not) { const y = pred(p.not); return y ? { not: y } : undefined; }
    if (!has(FIELDS, p?.field) || !has(OPS, p?.op)) { dropped++; return; }
    return { target: String(p.target ?? ""), field: p.field, op: p.op, value: p.value };
  };
  const tasks: Task[] = [];
  for (const t of x.tasks) {
    if (!has(OPERATIONS, t?.operation) || !has(SUBJECTS, t?.subject)) return { ok: false, dropped, why: `task ${t?.operation}/${t?.subject}` };
    const outputs = (t.outputs ?? []).filter((o: unknown) => has(OUTPUTS, o) || (dropped++, false));
    tasks.push({
      id: String(t.id ?? `t${tasks.length + 1}`), operation: t.operation, subject: t.subject, target: typeof t.target === "string" && entities[t.target] ? t.target : undefined,
      outputs, reported: (t.reported ?? []).map(pred).filter(Boolean), conditions: (t.conditions ?? []).map(pred).filter(Boolean),
      prohibitions: (t.prohibitions ?? []).filter((p: any) => has(OPERATIONS, p?.operation) && has(SUBJECTS, p?.subject)),
      depends_on: (t.depends_on ?? []).filter((d: unknown) => typeof d === "string"),
    });
  }
  const unresolved = Array.isArray(x.unresolved) ? x.unresolved : [];
  return { ok: true, canonical: { version: 1, tasks, entities, unresolved }, dropped };
}

const GOAL: Record<string, (s: string) => string> = {
  retrieve: (s) => `Retrieve ${s} information`,
  explain: (s) => `Explain ${s}`,
  assess: (s) => `Assess ${s} eligibility`,
  troubleshoot: (s) => `Troubleshoot ${s}`,
  request: (s) => ({ refund: "Request a refund", return: "Request a return", cancellation: "Request cancellation", replacement: "Request a replacement" } as Record<string, string>)[s] ?? `Request a change to ${s}`,
};

// Deterministic rendering: fixed phrases, entity labels re-allocated by first mention, sorted set-valued fields,
// no opaque bindings, no schema version.
export function render(c: Canonical): string {
  const label = new Map<string, string>(), count: Record<string, number> = {};
  const lab = (id?: string) => {
    if (!id || !c.entities[id]) return undefined;
    if (!label.has(id)) { const k = c.entities[id]!.kind; count[k] = (count[k] ?? 0) + 1; label.set(id, `${k}_${count[k]}`); }
    return label.get(id)!;
  };
  const val = (v: unknown) => (v && typeof v === "object" && "entity" in (v as any) ? lab((v as any).entity) ?? "an entity" : String(v));
  const expr = (e: Expr): string =>
    "all" in e ? `(${e.all.map(expr).join(" and ")})` : "any" in e ? `(${e.any.map(expr).join(" or ")})` : "not" in e ? `not ${expr(e.not)}` :
    `${lab(e.target) ?? "it"} ${words(e.field)} ${e.op === "eq" ? "is" : e.op === "ne" ? "is not" : e.op} ${val(e.value)}`;
  const idx = new Map(c.tasks.map((t, i) => [t.id, i + 1]));
  const lines: string[] = [];
  c.tasks.forEach((t, i) => {
    const target = lab(t.target);
    lines.push(`Task ${i + 1}: ${GOAL[t.operation]!(words(t.subject))}${target ? ` for ${target}` : ""}.`);
    const attrs = target ? Object.entries(c.entities[t.target!]!.attributes).sort(([a], [b]) => a.localeCompare(b)) : [];
    if (attrs.length) lines.push(`Attributes: ${attrs.map(([k, v]) => `${words(k)} ${v}`).join("; ")}.`);
    if (t.outputs.length) lines.push(`Requested outputs: ${[...new Set(t.outputs)].sort().map(words).join("; ")}.`);
    if (t.reported.length) lines.push(`Customer reports: ${t.reported.map(expr).join("; ")}.`);
    if (t.conditions.length) lines.push(`Conditions: ${t.conditions.map(expr).join("; ")}.`);
    const pro = [...new Set(t.prohibitions.map((p) => `do not ${p.operation} ${words(p.subject)}${lab(p.target) ? ` for ${lab(p.target)}` : ""}`))].sort();
    if (pro.length) lines.push(`Restrictions: ${pro.join("; ")}.`);
    const dep = t.depends_on.map((d) => idx.get(d)).filter(Boolean);
    if (dep.length) lines.push(`After: task ${dep.join(", task ")}.`);
  });
  return lines.join("\n");
}

// Goal signature (operation:subject per task): reuse is only considered between requests with the same goals.
export const signature = (c: Canonical) => c.tasks.map((t) => `${t.operation}:${t.subject}`).join("|");

const SYSTEM = `You normalize one customer-support message for an online clothing retailer into a compact JSON record (canonical request v1). Output only JSON, no prose.
Shape: {"version":1,"tasks":[{"id":"t1","operation":...,"subject":...,"target":"<entity id or omit>","outputs":[...],"reported":[predicate...],"conditions":[predicate...],"prohibitions":[{"operation":...,"subject":...,"target":...}],"depends_on":[]}],"entities":{"order_1":{"kind":...,"bindings":{},"attributes":{}}},"unresolved":[]}
operation (fixed meaning): retrieve = obtain existing state/record/value; explain = explain information or a policy; assess = evaluate a question about this case (eligibility); troubleshoot = investigate a reported problem without inventing a remedy; request = a requested state change.
subject: ${SUBJECTS.join(", ")}.
entity kind: ${KINDS.join(", ")}. bindings = exact ids/emails/names copied from the message (never invented). attributes (only if stated): ${ATTRIBUTES.join(", ")}.
outputs (only specifically requested info): ${OUTPUTS.join(", ")}.
predicate: {"target":"<entity id>","field":<field>,"op":"eq"|"ne"|"lt"|"lte"|"gt"|"gte"|"contains","value":<string|number|boolean>}; fields: ${FIELDS.join(", ")}.
reported = customer claims/symptoms; conditions = requirements the customer imposes; prohibitions = operations the customer excludes.
Describe what the customer wants, not how to solve it. No workflow names, no tools, no confidence. One task per requested goal, in the order expressed.
Missing order numbers, names, emails or account details are NOT unresolved: the agent looks them up from records. Create the entity (e.g. order_1 with empty bindings) and use it as the target.
Always pick the closest subject from the list when the goal is understandable; unresolved is only for messages with no understandable goal.
If the message has no understandable request (e.g. only a greeting) or needs a subject outside the list, emit tasks: [] and one unresolved item {"kind":"ambiguous_intent"|"unsupported_semantics","quote":"...","detail":"..."}.`;

let client: Anthropic | undefined;
export async function haikuCanonical(text: string): Promise<{ canonical?: Canonical; rendered?: string; sig?: string; why?: string; dropped: number; inputTokens: number; outputTokens: number }> {
  client ??= new Anthropic();
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await client.messages.create({ model: process.env.NORMALIZER_MODEL ?? "claude-haiku-4-5", max_tokens: 700, system: SYSTEM, messages: [{ role: "user", content: text.slice(0, 2000) }] });
      const out = r.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
      const usage = { inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens };
      let json: unknown;
      try { json = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1)); } catch { return { why: "unparseable", dropped: 0, ...usage }; }
      const v = validate(json);
      if (!v.ok || !v.canonical) return { why: (json as any)?.unresolved?.length ? `unresolved:${(json as any).unresolved[0]?.kind}` : v.why, dropped: v.dropped, ...usage };
      // missing_reference items are resolved by the executor from records (contract: not automatically a question
      // to the customer); ambiguity, contradiction or unsupported semantics block reuse.
      v.canonical.unresolved = v.canonical.unresolved.filter((u) => u.kind !== "missing_reference");
      if (v.canonical.unresolved.length) return { canonical: v.canonical, why: `unresolved:${v.canonical.unresolved[0]?.kind}`, dropped: v.dropped, ...usage };
      return { canonical: v.canonical, rendered: render(v.canonical), sig: signature(v.canonical), dropped: v.dropped, ...usage };
    } catch (e) {
      if (attempt >= 2) throw e;
      await Bun.sleep(700 * (attempt + 1));
    }
  }
}
