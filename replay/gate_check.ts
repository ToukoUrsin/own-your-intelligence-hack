// Gate check (warm): the final run's 42 hard tickets + its last 100 normal tickets, starting from the final run's
// learned procedure store and plans (copied to replay/gate-check/). --baseline runs the same tickets without memory.
// MEMORY_STORE=replay/gate-check/procedures.jsonl PLANS_DIR=replay/gate-check/plans bun replay/gate_check.ts [--baseline]
import { appendFileSync } from "node:fs";
import { solve } from "../agent/src/memory";
const base = process.argv.includes("--baseline");
const rev = process.argv.includes("--reverse"); // second worker pool from the end (merged by id in gate_report.ts)
const OUT = `replay/gate-check/${base ? "baseline" : "gated"}${rev ? "-b" : ""}.jsonl`;
const PRICE_IN = 5 / 1e6, PRICE_OUT = 25 / 1e6, RIVER_IN = 1 / 1e6;
const rd = async (p: string) => (await Bun.file(p).text()).split("\n").filter(Boolean).map((l) => JSON.parse(l));
const byId = new Map([...(await rd("data/tickets.jsonl")), ...(await rd("data/hard_tickets.jsonl")).map((t: any) => ({ ...t, hard: true }))].map((t: any) => [t.id, t]));
const final = (await rd("replay/results.jsonl")).sort((a: any, b: any) => a.i - b.i);
const ids = [...final.filter((r: any) => r.hard).map((r: any) => r.id), ...final.filter((r: any) => !r.hard).slice(-100).map((r: any) => r.id)];
if (rev) ids.reverse();
await Bun.write(OUT, "");
let k = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (k < ids.length) {
    const t: any = byId.get(ids[k++]!)!;
    const text = t.email ? `${t.text}\n\n(from: ${t.email})` : t.text;
    for (let a = 0; ; a++) {
      try {
        const s = await solve(text, base ? { id: t.id, recall: false, learn: false } : { id: t.id, goldIntent: t.intent });
        const river = s.normalized.source === "river" ? (text.length / 4 + 300) * RIVER_IN : 0;
        const row = { id: t.id, hard: !!t.hard, hardKind: t.hard_kind, intent: t.intent, goldActions: t.actions?.map((x: any) => x.action ?? x), tier: s.tier, gate_reason: s.gate_reason, routerConfidence: s.routerConfidence, routerIntent: s.normalized.intent, procedureId: s.procedureId, procedureIntent: s.procedureIntent, similarity: s.similarity, tools: s.steps.map((x) => x.tool), cost: +(s.inputTokens * PRICE_IN + s.outputTokens * PRICE_OUT + river).toFixed(6), ms: s.ms, reply: s.reply };
        appendFileSync(OUT, JSON.stringify(row) + "\n");
        console.log(t.id, row.tier, row.gate_reason ?? "", row.routerConfidence ?? "", `$${row.cost.toFixed(3)}`);
        break;
      } catch (e) { if (a >= 2) { console.log(t.id, "ERROR", String(e).slice(0, 100)); break; } await Bun.sleep(3000); }
    }
  }
}));
