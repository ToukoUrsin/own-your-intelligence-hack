// Gate-check report: replay/gate-check/{gated,baseline}.jsonl + the final run's rows for the same tickets →
// replay/gate-check.json. Haiku judge (claude-haiku-4-5): "did the reply resolve the request correctly per policy?"
import Anthropic from "@anthropic-ai/sdk";
import { agreement, expressible } from "./abcd_map";
const rd = async (p: string) => (await Bun.file(p).text()).split("\n").filter(Boolean).map((l) => JSON.parse(l));
const merge = async (p: string) => { const seen = new Set<string>(); return [...(await rd(p)), ...((await Bun.file(p.replace(".jsonl", "-b.jsonl")).exists()) ? await rd(p.replace(".jsonl", "-b.jsonl")) : [])].filter((r: any) => !seen.has(r.id) && seen.add(r.id)); };
const gated = await merge("replay/gate-check/gated.jsonl"), base = await merge("replay/gate-check/baseline.jsonl");
const finalById = new Map((await rd("replay/results.jsonl")).map((r: any) => [r.id, r]));
const cal = await Bun.file("replay/gate-calibration.json").json();
const tickets = new Map([...(await rd("data/tickets.jsonl")), ...(await rd("data/hard_tickets.jsonl"))].map((t: any) => [t.id, t]));
const ids = gated.map((r: any) => r.id).filter((id: string) => base.some((b: any) => b.id === id));
const G = new Map(gated.map((r: any) => [r.id, r])), B = new Map(base.map((r: any) => [r.id, r]));
const scope = expressible([...gated, ...base].flatMap((r: any) => r.tools));
const src = await Bun.file("agent/src/agent.ts").text();
const POLICY = src.slice(src.indexOf("const SYSTEM = `") + 16, src.indexOf("`;", src.indexOf("const SYSTEM = `"))).replace("${TODAY}", "2026-09-27");
const client = new Anthropic();
async function judge(id: string, reply: string): Promise<boolean | undefined> {
  const t: any = tickets.get(id);
  const ref = `Human agent's actions (reference, ABCD format; [] = escalate): ${JSON.stringify((t.actions ?? []).map((x: any) => x.action ?? x))}${t.note ? `\nExpected outcome note: ${t.note}` : ""}`;
  for (let a = 0; a < 3; a++) try {
    const r = await client.messages.create({ model: "claude-haiku-4-5", max_tokens: 5, system: `You grade customer-support replies for Northwind Outfitters. Store policy and agent instructions:\n${POLICY}\n\nAnswer only "yes" or "no".`,
      messages: [{ role: "user", content: `Customer ticket:\n${t.text}\n\n${ref}\n\nAgent's final reply:\n${reply}\n\nDid the reply resolve the request correctly per policy (or correctly escalate/ask for what is needed)? yes or no.` }] });
    const s = (r.content[0] as any).text.trim().toLowerCase(); return s.startsWith("yes");
  } catch { await Bun.sleep(2000); }
}
const jobs: [string, string, string][] = [];
for (const id of ids) { jobs.push([id, "gated", G.get(id).reply]); jobs.push([id, "baseline", B.get(id).reply]); if (finalById.get(id)) jobs.push([id, "ungated", finalById.get(id).reply]); }
const J = new Map<string, boolean | undefined>(); let k = 0;
await Promise.all(Array.from({ length: 16 }, async () => { while (k < jobs.length) { const [id, w, rep] = jobs[k++]!; J.set(`${w}:${id}`, await judge(id, rep ?? "")); } }));
const pct = (n: number, d: number) => (d ? +(n / d).toFixed(3) : null);
function block(which: "gated" | "baseline" | "ungated", sel: string[], tierOf?: (id: string) => string) {
  const rows = sel.map((id) => ({ id, r: which === "gated" ? G.get(id) : which === "baseline" ? B.get(id) : finalById.get(id) })).filter((x) => x.r);
  const ag = rows.map((x) => agreement(x.r.tools, x.r.goldActions, scope)).filter(Boolean) as any[];
  const jd = rows.map((x) => J.get(`${which}:${x.id}`)).filter((v) => v !== undefined);
  return { n: rows.length, exactActionMatch: pct(ag.filter((a) => a.exact).length, ag.length), meanJaccard: pct(ag.reduce((s, a) => s + a.jaccard, 0), ag.length), judgeYes: pct(jd.filter(Boolean).length, jd.length), costPerTicket: +(rows.reduce((s, x) => s + x.r.cost, 0) / (rows.length || 1)).toFixed(4) };
}
const tierSplit = (which: "gated" | "ungated", sel: string[]) => Object.fromEntries(["recalled", "compiled", "explored"].map((tier) => [tier, block(which, sel.filter((id) => (which === "gated" ? G.get(id) : finalById.get(id))?.tier === tier))]));
const hardIds = ids.filter((id: string) => G.get(id).hard), normIds = ids.filter((id: string) => !G.get(id).hard);
const wrongProc = (rows: any[]) => rows.filter((r) => (r.tier === "recalled" || r.tier === "compiled") && r.procedureIntent && r.procedureIntent !== r.intent).length;
const reused = (rows: any[]) => rows.filter((r) => r.tier !== "explored").length;
const hardG = hardIds.map((id: string) => G.get(id)), hardU = hardIds.map((id: string) => finalById.get(id)), normG = normIds.map((id: string) => G.get(id)), normU = normIds.map((id: string) => finalById.get(id));
// Post-hoc curve on the gate-check tickets: router confidence (recorded in the gated run) vs the final run's recall outcome.
const curve = [0.5, 0.6, 0.7, 0.8, 0.9].map((th) => {
  const nr = normIds.filter((id: string) => finalById.get(id).tier === "recalled"), ok = nr.filter((id: string) => finalById.get(id).procedureIntent === finalById.get(id).intent);
  const hr = hardIds.filter((id: string) => finalById.get(id).tier !== "explored");
  const pass = (id: string) => (G.get(id).routerConfidence ?? 0) >= th;
  const h = cal.heldout, hk = h.filter((x: any) => (x.conf ?? 0) >= th);
  return { threshold: th, heldout: { pass: pct(hk.length, h.length), routerPrecision: pct(hk.filter((x: any) => x.correct).length, hk.length), correctKept: pct(hk.filter((x: any) => x.correct).length, h.filter((x: any) => x.correct).length) },
    finalRunSlice: { correctNormalRecallsKept: pct(ok.filter(pass).length, ok.length), wrongNormalRecallsKept: pct(nr.filter((id: string) => !ok.includes(id)).filter(pass).length, nr.length - ok.length), hardReusesStillPassing: pct(hr.filter(pass).length, hr.length) } };
});
const out = {
  run: "gate check (warm): starts from the final run's learned procedure store + plans (copies in replay/gate-check/); 42 hard + last 100 normal tickets of the final run's order; concurrency 8; recall backend local store (exact key, then cosine) so the shared Memorable store is not modified; baseline = same tickets, full agent, no memory",
  gate: { confidenceThreshold: Number(process.env.GATE_CONF ?? 0.7), multiRequest: "regex on request clauses (two things/also/while I have you/…) or >=3 question marks", onGate: "full agent (EXPLORED), nothing learned, row carries gate_reason" },
  calibration: { note: "threshold picked on data/heldout.jsonl (River label vs gold): 0.7 keeps 75/77 correct routes and drops 13 of 23 misrouted; the final-run slice columns are post hoc", curve },
  hard: { n: hardIds.length, sentToFullAgent: pct(hardG.filter((r) => r.tier === "explored").length, hardIds.length), gateReasons: Object.entries(hardG.reduce((m: any, r) => (r.gate_reason && (m[r.gate_reason.split(":")[0]] = (m[r.gate_reason.split(":")[0]] ?? 0) + 1), m), {})),
    wrongProcedure: { gated: pct(wrongProc(hardG), hardIds.length), ungatedFinalRun: pct(wrongProc(hardU), hardIds.length) }, reused: { gated: reused(hardG), ungatedFinalRun: reused(hardU) },
    gated: tierSplit("gated", hardIds), gatedAll: block("gated", hardIds), ungatedFinalRun: block("ungated", hardIds), baseline: block("baseline", hardIds) },
  normal: { n: normIds.length, reusedShare: { gated: pct(reused(normG), normIds.length), ungatedFinalRun: pct(reused(normU), normIds.length) }, gatedCount: normG.filter((r) => r.gate_reason).length,
    tiers: { gated: Object.fromEntries(["recalled", "compiled", "explored"].map((t) => [t, normG.filter((r) => r.tier === t).length])), ungatedFinalRun: Object.fromEntries(["recalled", "compiled", "explored"].map((t) => [t, normU.filter((r) => r.tier === t).length])) },
    wrongProcedure: { gated: pct(wrongProc(normG), normIds.length), ungatedFinalRun: pct(wrongProc(normU), normIds.length) },
    gated: tierSplit("gated", normIds), gatedAll: block("gated", normIds), ungatedFinalRun: block("ungated", normIds), baseline: block("baseline", normIds) },
  caveats: ["warm run on tickets the final run already saw (store learned from them), so reuse is optimistic", "ungated numbers are the final run's rows for the same tickets (cold-start run, Memorable key recall), not a rerun", "judge sees ticket, reply, policy and the human agent's actions, not the shop database"],
};
await Bun.write("replay/gate-check.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ hard: { ...out.hard, gated: undefined }, normal: { ...out.normal, gated: undefined }, curve }, null, 1));
