// Pre-compile plans from learned procedures + successful replay rows, then validate each plan offline on up to 10
// matching replay tickets (mock shop): tool agreement vs gold ABCD actions, reply agreement vs the agent's reply
// (Claude Haiku as judge), $/ticket and ms vs the agent. Also simulates online compilation over the replay order
// (plan available once its procedure reached N successful reuses) → tier curve per 25-ticket bucket.
// Run: cd agent && hsec exec --only ANTHROPIC_API_KEY -- bun ../replay/compile_eval.ts [--no-compile]
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compile, execute, loadPlans, savePlan, MIN_USES, PLANS_DIR, toTask, lastFallback, type Plan, type ProcedureLike } from "../agent/src/compiled";
import { agreement, expressible } from "./abcd_map";

const R = import.meta.dir;
const SNAP = process.env.REPLAY_SNAPSHOT; // dir with procedures.jsonl + results.jsonl (default replay/)
const jsonl = (f: string) => readFileSync(join(SNAP ?? R, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const procs: (ProcedureLike & { key?: string })[] = jsonl("procedures.jsonl");
const rows: any[] = jsonl("results.jsonl").sort((a, b) => a.i - b.i);
const tickets = new Map<string, any>(readFileSync(join(R, "../data/tickets.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => { const t = JSON.parse(l); return [t.id, t]; }));
const text = (id: string) => { const t = tickets.get(id)!; return t.email ? `${t.text}\n\n(from: ${t.email})` : t.text; };
const FAQ = new Set(["timing", "policy", "pricing", "membership", "jeans", "jacket", "boots", "shirt"]);
const ok = (r: any) => r.reply && !r.abandoned;

// ---------- 1. compile ----------
const compileLog: any[] = [];
if (!process.argv.includes("--no-compile")) {
  rmSync(PLANS_DIR, { recursive: true, force: true });
  const faqUses = procs.filter((p) => FAQ.has(p.intent ?? "")).reduce((s, p) => s + (p.uses ?? 0), 0);
  await Promise.all(procs.filter((p) => p.key && p.intent).map(async (p) => {
    const examples = rows.filter((r) => r.normalized === p.key && ok(r)).slice(0, 5).map((r) => ({ ticket: text(r.id), reply: r.reply }));
    const aggregate = FAQ.has(p.intent!) ? faqUses : undefined;
    const res = await compile(p, examples, { aggregateUses: aggregate });
    compileLog.push({ procedure: p.id, intent: p.intent, uses: p.uses, ...(aggregate ? { familyUses: aggregate } : {}), compiled: res.plan?.id ?? null, risk: res.plan?.risk, reason: res.reason });
    console.log(p.id, p.intent, res.plan ? `→ ${res.plan.id} (${res.plan.risk}, reply ${res.plan.source.replyTemplate})` : `✗ ${res.reason}`);
  }));
}
const plans = loadPlans();
const byKey = new Map(plans.map((p) => [p.match.key, p]));

// ---------- 2. validate ----------
const judge = new Anthropic();
async function judgeReply(ticket: string, agent: string, compiled: string, steps: unknown) {
  for (let a = 0; a < 3; a++) try {
    const r = await judge.messages.create({ model: "claude-haiku-4-5", max_tokens: 200, messages: [{ role: "user", content: `Customer ticket:\n${ticket}\n\nReference reply (LLM agent):\n${agent}\n\nCandidate reply (deterministic program):\n${compiled}\n\nTool evidence the candidate used:\n${JSON.stringify(steps).slice(0, 3000)}\n\nAnswer JSON only: {"agree": true|false, "correct": true|false}. agree = candidate conveys the same outcome/facts as the reference (wording may differ). correct = candidate answers the customer's question accurately given the evidence and makes no false claim.` }] });
    const t = r.content.map((b: any) => b.text ?? "").join("");
    return JSON.parse(t.match(/\{[^}]*\}/)![0]) as { agree: boolean; correct: boolean };
  } catch { await Bun.sleep(500); }
  return { agree: false, correct: false };
}
const scope = expressible(rows.flatMap((r) => r.tools ?? []));
const perPlan: any[] = [];
for (const plan of plans) {
  const sample = rows.filter((r) => r.normalized === plan.match.key).slice(0, 10);
  const res = await Promise.all(sample.map(async (r) => {
    const ticket = text(r.id);
    const task = toTask({ request: r.normalized, intent: plan.match.topic }, ticket)!;
    const t0 = performance.now();
    const c = await execute(plan, task, ticket);
    const ms = performance.now() - t0;
    if (!c) return { id: r.id, compiled: false, fallback: lastFallback };
    const tools = c.steps.map((s) => s.tool);
    const ag = agreement(tools, r.goldActions, scope), agentAg = agreement(r.tools, r.goldActions, scope);
    const j = ok(r) ? await judgeReply(ticket, r.reply, c.reply, c.steps) : { agree: false, correct: false };
    return { id: r.id, compiled: true, ms, tools, goldJaccard: ag?.jaccard, agentGoldJaccard: agentAg?.jaccard, ...j, agentCost: r.cost, agentMs: r.ms, normCost: r.normCost ?? 0, reply: c.reply };
  }));
  const done = res.filter((x) => x.compiled) as any[];
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  const r3 = (x: number | null) => (x == null ? null : Math.round(x * 1000) / 1000);
  perPlan.push({
    plan: plan.id, risk: plan.risk, procedure: plan.source.procedureId, uses: plan.source.uses, replyTemplate: plan.source.replyTemplate,
    tested: res.length, coverage: r3(res.length ? done.length / res.length : null),
    success: r3(res.length ? done.filter((x) => x.correct).length / res.length : null), // compiled AND judged correct, over all tested
    replyAgreement: r3(avg(done.map((x) => (x.agree ? 1 : 0)))), replyCorrect: r3(avg(done.map((x) => (x.correct ? 1 : 0)))),
    goldToolJaccard: r3(avg(done.map((x) => x.goldJaccard).filter((x) => x != null))), agentGoldToolJaccard: r3(avg(done.map((x) => x.agentGoldJaccard).filter((x) => x != null))),
    costPerTicket: { compiled: r3(avg(done.map((x) => x.normCost))), agent: r3(avg(done.map((x) => x.agentCost))) },
    ms: { compiled: r3(avg(done.map((x) => x.ms))), agent: Math.round(avg(done.map((x) => x.agentMs)) ?? 0) },
    fallbacks: res.filter((x) => !x.compiled).map((x) => `${x.id}: ${x.fallback}`),
    example: done[0] ? { ticket: done[0].id, reply: done[0].reply } : undefined,
  });
  // Promote: a plan serves traffic only if ≥3 tickets compiled and ≥75% of its compiled replies were judged correct.
  const correct = done.filter((x) => x.correct).length;
  plan.validation = { tested: res.length, compiled: done.length, correct, precision: done.length ? r3(correct / done.length) : null };
  plan.enabled = done.length >= 3 && correct / done.length >= 0.75;
  perPlan.at(-1).precision = plan.validation.precision; perPlan.at(-1).enabled = plan.enabled;
  savePlan(plan);
  console.log(perPlan.at(-1).plan, plan.enabled, perPlan.at(-1).coverage, perPlan.at(-1).success, perPlan.at(-1).replyAgreement);
}

// ---------- 3. online-compilation curve over the replay order ----------
const useCount = new Map<string, number>(), live = new Set<string>();
const planOf = (key?: string) => (key ? byKey.get(key) : undefined);
const faqPlanKeys = new Set(plans.filter((p) => FAQ.has(p.match.topic ?? "")).map((p) => p.match.key));
let faqUses = 0;
const buckets: { from: number; explored: number; recalled: number; compiled: number }[] = [];
for (const [n, r] of rows.entries()) {
  const b = Math.floor(n / 25);
  buckets[b] ??= { from: n + 1, explored: 0, recalled: 0, compiled: 0 };
  const p = planOf(r.normalized);
  let tier: "explored" | "recalled" | "compiled" = r.recalled ? "recalled" : "explored";
  if (p && p.enabled && live.has(p.id)) {
    const c = await execute(p, toTask({ request: r.normalized, intent: p.match.topic }, text(r.id))!, text(r.id), { dryRun: true });
    if (c) tier = "compiled";
  }
  buckets[b]![tier]++;
  if (r.recalled && ok(r)) { // a successful reuse reinforces the procedure; at N reuses its plan goes live
    useCount.set(r.normalized, (useCount.get(r.normalized) ?? 0) + 1);
    if (faqPlanKeys.has(r.normalized)) faqUses++;
    for (const q of plans) if ((useCount.get(q.match.key!) ?? 0) >= MIN_USES || (faqPlanKeys.has(q.match.key) && faqUses >= MIN_USES)) live.add(q.id);
  }
}
const curve = buckets.map((b) => { const n = b.explored + b.recalled + b.compiled; return { tickets: `${b.from}-${b.from + n - 1}`, explored: +(b.explored / n).toFixed(2), recalled: +(b.recalled / n).toFixed(2), compiled: +(b.compiled / n).toFixed(2) }; });

const tested = perPlan.reduce((s, p) => s + p.tested, 0), compiledN = perPlan.reduce((s, p) => s + Math.round(p.coverage * p.tested), 0);
const en = perPlan.filter((p) => p.enabled);
const enT = en.reduce((s, p) => s + p.tested, 0), enC = en.reduce((s, p) => s + Math.round(p.coverage * p.tested), 0), enOk = en.reduce((s, p) => s + Math.round((p.success ?? 0) * p.tested), 0);
const out = {
  enabled: { plans: en.length, read: en.filter((p) => p.risk === "read").length, write: en.filter((p) => p.risk === "write").length, tested: enT, compiled: enC, correct: enOk, precision: +(enOk / Math.max(1, enC)).toFixed(3), coverageOfTheirTickets: +(enC / Math.max(1, enT)).toFixed(3) },
  generatedAt: new Date().toISOString(), minUses: MIN_USES, plans: plans.length, readPlans: plans.filter((p) => p.risk === "read").length, writePlans: plans.filter((p) => p.risk === "write").length,
  overall: { tested, compiled: compiledN, coverage: +(compiledN / Math.max(1, tested)).toFixed(3), success: +(perPlan.reduce((s, p) => s + (p.success ?? 0) * p.tested, 0) / Math.max(1, tested)).toFixed(3), modelCallsPerCompiledTicket: 0 },
  canonicalInput: "Haiku stand-in intent label → v1 {operation, subject, topic} via INTENT_V1 in compiled.ts (River endpoint not available); plans also match by the standardized key. No normalizer → regex fallback for refund status only.",
  judge: "claude-haiku-4-5 compares compiled reply with the agent's reply for the same ticket (offline check only).",
  curve, perPlan, notCompiled: compileLog.filter((c) => !c.compiled),
};
writeFileSync(join(R, "compiled-eval.json"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ overall: out.overall, enabled: out.enabled, curve }, null, 1));
