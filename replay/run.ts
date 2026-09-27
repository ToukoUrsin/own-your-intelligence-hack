// Replay real tickets in order through the Memorable layer and measure the learning curve.
// bun replay/run.ts [--n 60] [--concurrency 4] [--bucket 25] [--keep] [--no-memory] [--tickets data/tickets.jsonl]
import { join } from "node:path";
import { appendFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { resetMemory, solve } from "../agent/src/memory";

const { values: a } = parseArgs({
  options: {
    n: { type: "string", default: "60" },
    concurrency: { type: "string", default: "4" },
    bucket: { type: "string", default: "25" },
    tickets: { type: "string", default: join(import.meta.dir, "../data/tickets.jsonl") },
    out: { type: "string", default: join(import.meta.dir, "results.jsonl") },
    keep: { type: "boolean", default: false },
    "no-memory": { type: "boolean", default: false },
  },
});

const PRICE_IN = 5 / 1e6, PRICE_OUT = 25 / 1e6; // Claude Opus 5, $ per token
const N = Number(a.n), C = Number(a.concurrency), BUCKET = Number(a.bucket), memoryOn = !a["no-memory"];

type Ticket = { id: string; text: string; intent?: string; email?: string };
const tickets: Ticket[] = (await Bun.file(a.tickets!).text()).split("\n").filter(Boolean).map((l) => JSON.parse(l)).slice(0, N);
if (!a.keep) await resetMemory();
await Bun.write(a.out!, "");

type Row = { i: number; id: string; intent?: string; recalled: boolean; similarity: number; procedure?: string; learned?: string; normalized: string; steps: number; tools: string[]; modelCalls: number; ms: number; inputTokens: number; outputTokens: number; cost: number; reply: string; error?: string };
const rows: Row[] = [];
let next = 0;

async function worker() {
  while (next < tickets.length) {
    const i = next++, t = tickets[i];
    const text = t.email ? `${t.text}\n\n(from: ${t.email})` : t.text;
    let row: Row;
    try {
      const s = await solve(text, { id: t.id, recall: memoryOn, learn: memoryOn });
      row = {
        i, id: t.id, intent: t.intent, recalled: s.recalled, similarity: +s.similarity.toFixed(3), procedure: s.procedureTitle, learned: s.learned,
        normalized: s.normalized.request, steps: s.steps.length, tools: s.steps.map((x) => x.tool), modelCalls: s.modelCalls, ms: s.ms,
        inputTokens: s.inputTokens, outputTokens: s.outputTokens, cost: +(s.inputTokens * PRICE_IN + s.outputTokens * PRICE_OUT).toFixed(5), reply: s.reply,
      };
    } catch (e) {
      row = { i, id: t.id, intent: t.intent, recalled: false, similarity: 0, normalized: t.text, steps: 0, tools: [], modelCalls: 0, ms: 0, inputTokens: 0, outputTokens: 0, cost: 0, reply: "", error: String(e) };
    }
    rows.push(row);
    appendFileSync(a.out!, JSON.stringify(row) + "\n");
    console.log(`${row.id} ${(row.intent ?? "").padEnd(24)} ${row.error ? "ERROR " + row.error.slice(0, 80) : `${row.recalled ? "RECALL" : "explore"} sim=${row.similarity} steps=${row.steps} ${(row.ms / 1000).toFixed(1)}s $${row.cost.toFixed(4)}${row.learned ? " +" + row.learned : ""}`}`);
  }
}
await Promise.all(Array.from({ length: C }, worker));

rows.sort((x, y) => x.i - y.i);
const ok = rows.filter((r) => !r.error);
const avg = (xs: Row[], f: (r: Row) => number) => (xs.length ? xs.reduce((s, r) => s + f(r), 0) / xs.length : 0);
const buckets = [];
for (let b = 0; b < ok.length; b += BUCKET) {
  const xs = ok.slice(b, b + BUCKET);
  buckets.push({
    tickets: `${b + 1}-${b + xs.length}`,
    n: xs.length,
    recallRate: +avg(xs, (r) => +r.recalled).toFixed(2),
    costPerTicket: +avg(xs, (r) => r.cost).toFixed(4),
    secondsPerTicket: +avg(xs, (r) => r.ms / 1000).toFixed(1),
    toolCallsPerTicket: +avg(xs, (r) => r.steps).toFixed(1),
    modelCallsPerTicket: +avg(xs, (r) => r.modelCalls).toFixed(1),
  });
}
const first = buckets[0], last = buckets[buckets.length - 1];
const change = (k: "costPerTicket" | "secondsPerTicket" | "toolCallsPerTicket") => (first && last ? `${(((last[k] - first[k]) / first[k]) * 100).toFixed(0)}%` : "n/a");
const summary = {
  memory: memoryOn, tickets: rows.length, errors: rows.length - ok.length,
  totalCost: +ok.reduce((s, r) => s + r.cost, 0).toFixed(3),
  recalled: ok.filter((r) => r.recalled).length,
  recalledCost: +avg(ok.filter((r) => r.recalled), (r) => r.cost).toFixed(4),
  exploredCost: +avg(ok.filter((r) => !r.recalled), (r) => r.cost).toFixed(4),
  buckets,
  firstVsLast: { cost: change("costPerTicket"), time: change("secondsPerTicket"), toolCalls: change("toolCallsPerTicket") },
};
await Bun.write(join(import.meta.dir, memoryOn ? "summary.json" : "summary-baseline.json"), JSON.stringify(summary, null, 2) + "\n");
console.table(buckets);
console.log(JSON.stringify({ ...summary, buckets: undefined }, null, 2));
