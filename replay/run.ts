// Replay real tickets in order through the Memorable layer and measure the learning curve.
// bun replay/run.ts [--n 60] [--concurrency 4] [--bucket 25] [--keep] [--no-memory] [--out replay/results.jsonl] [--tickets data/tickets.jsonl]
// Normalizer: ROUTER_URL (River) if set, else NORMALIZER=haiku, else raw text.
import { join } from "node:path";
import { appendFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { activeNormalizer, resetMemory, solve } from "../agent/src/memory";
import { summarize } from "./summarize";

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
const NORM_IN = 1 / 1e6, NORM_OUT = 5 / 1e6; // claude-haiku-4-5 normalizer, $ per token
const N = Number(a.n), C = Number(a.concurrency), BUCKET = Number(a.bucket), memoryOn = !a["no-memory"];

type Ticket = { id: string; text: string; intent?: string; email?: string; actions?: (string | { action: string })[] };
const tickets: Ticket[] = (await Bun.file(a.tickets!).text()).split("\n").filter(Boolean).map((l) => JSON.parse(l)).slice(0, N);
if (!a.keep) await resetMemory();
await Bun.write(a.out!, "");

type Row = { i: number; id: string; intent?: string; recalled: boolean; similarity: number; procedure?: string; procedureId?: string; procedureIntent?: string; procedureTools?: string[]; goldActions?: string[]; learned?: string; reinforced?: string; revised?: string; abandoned?: boolean; library: number; tier: string; shadow?: unknown; backend?: string; planId?: string; signature?: string; normWhy?: string; normalizer: string; normalized: string; normCost?: number; steps: number; tools: string[]; modelCalls: number; ms: number; inputTokens: number; outputTokens: number; cost: number; reply: string; error?: string };
const rows: Row[] = [];
let next = 0;

async function worker() {
  while (next < tickets.length) {
    const i = next++, t = tickets[i];
    const text = t.email ? `${t.text}\n\n(from: ${t.email})` : t.text;
    let row: Row;
    try {
      const s = await solve(text, { id: t.id, recall: memoryOn, learn: memoryOn, goldIntent: t.intent });
      const normCost = (s.normalized.inputTokens ?? 0) * NORM_IN + (s.normalized.outputTokens ?? 0) * NORM_OUT + (s.shadowCost ?? 0);
      row = {
        i, id: t.id, intent: t.intent, recalled: s.recalled, similarity: +s.similarity.toFixed(3), procedure: s.procedureTitle, procedureId: s.procedureId,
        procedureIntent: s.procedureIntent, procedureTools: s.procedureTools, goldActions: t.actions?.map((x) => (typeof x === "string" ? x : x.action)), learned: s.learned, reinforced: s.reinforced, revised: s.revised, abandoned: s.abandoned, library: s.library, tier: s.tier, shadow: s.shadow, backend: s.backend, planId: s.planId, signature: s.normalized.signature, normWhy: s.normalized.why,
        normalizer: memoryOn ? s.normalized.source : "none", normalized: s.normalized.request, normCost: +normCost.toFixed(6),
        steps: s.steps.length, tools: s.steps.map((x) => x.tool), modelCalls: s.modelCalls, ms: s.ms,
        inputTokens: s.inputTokens, outputTokens: s.outputTokens, cost: +(s.inputTokens * PRICE_IN + s.outputTokens * PRICE_OUT + normCost).toFixed(5), reply: s.reply,
      };
    } catch (e) {
      row = { i, id: t.id, intent: t.intent, recalled: false, similarity: 0, library: 0, tier: "error", normalizer: "error", normalized: t.text, steps: 0, tools: [], modelCalls: 0, ms: 0, inputTokens: 0, outputTokens: 0, cost: 0, reply: "", error: String(e) };
    }
    rows.push(row);
    appendFileSync(a.out!, JSON.stringify(row) + "\n");
    console.log(`${row.id} ${(row.intent ?? "").padEnd(24)} ${row.error ? "ERROR " + row.error.slice(0, 80) : `${row.tier.toUpperCase().slice(0, 8)} [${row.normalized.slice(0, 24)}] sim=${row.similarity} steps=${row.steps} ${(row.ms / 1000).toFixed(1)}s $${row.cost.toFixed(4)} lib=${row.library}${row.learned ? " +" + row.learned : ""}${row.reinforced ? " ^" + row.reinforced : ""}${row.revised ? " ~" + row.revised : ""}`}`);
  }
}
await Promise.all(Array.from({ length: C }, worker));

rows.sort((x, y) => x.i - y.i);
await Bun.write(a.out!, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
console.log(`normalizer: ${memoryOn ? activeNormalizer() : "none (baseline)"}`);
await summarize(BUCKET);
