// Summaries for the replay runs: summary.json (memory run, results.jsonl, compared with baseline.jsonl) and
// summary-baseline.json. Run on its own after both runs: bun replay/summarize.ts [--bucket 25]
import { join } from "node:path";
import { agreement, expressible } from "./abcd_map";

type Row = {
  i: number; id: string; intent?: string; recalled: boolean; procedureIntent?: string; procedureTools?: string[]; tools?: string[]; goldActions?: string[]; learned?: string; reinforced?: string; revised?: string;
  library: number; normalizer: string; steps: number; modelCalls: number; ms: number; cost: number; normCost?: number; error?: string;
};

const DIR = import.meta.dir;
const read = async (f: string): Promise<Row[]> => {
  const file = Bun.file(join(DIR, f));
  if (!(await file.exists())) return [];
  return (await file.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l)).sort((a: Row, b: Row) => a.i - b.i);
};
const avg = (xs: Row[], f: (r: Row) => number) => (xs.length ? xs.reduce((s, r) => s + f(r), 0) / xs.length : 0);
const pct = (a: number, b: number) => (b ? `${Math.round(((a - b) / b) * 100)}%` : "n/a");

function stats(rows: Row[], bucket: number) {
  const ok = rows.filter((r) => !r.error);
  const buckets = [];
  for (let b = 0; b < ok.length; b += bucket) {
    const xs = ok.slice(b, b + bucket);
    const rec = xs.filter((r) => r.recalled);
    buckets.push({
      tickets: `${b + 1}-${b + xs.length}`,
      n: xs.length,
      recallRate: +avg(xs, (r) => +r.recalled).toFixed(2),
      recallPrecision: rec.length ? +avg(rec, (r) => +(r.procedureIntent === r.intent)).toFixed(2) : null,
      costPerTicket: +avg(xs, (r) => r.cost).toFixed(4),
      secondsPerTicket: +avg(xs, (r) => r.ms / 1000).toFixed(1),
      toolCallsPerTicket: +avg(xs, (r) => r.steps).toFixed(1),
      modelCallsPerTicket: +avg(xs, (r) => r.modelCalls).toFixed(1),
      libraryAtEnd: Math.max(0, ...xs.map((r) => r.library ?? 0)),
    });
  }
  return { ok, buckets };
}

export async function summarize(bucket = 25) {
  const mem = await read("results.jsonl");
  const base = await read("baseline.jsonl");
  const b = stats(base, bucket);
  const baseline = base.length ? {
    tickets: base.length, errors: base.length - b.ok.length,
    costPerTicket: +avg(b.ok, (r) => r.cost).toFixed(4),
    secondsPerTicket: +avg(b.ok, (r) => r.ms / 1000).toFixed(1),
    toolCallsPerTicket: +avg(b.ok, (r) => r.steps).toFixed(1),
    totalCost: +b.ok.reduce((s, r) => s + r.cost, 0).toFixed(3),
    buckets: b.buckets,
  } : undefined;
  if (baseline) await Bun.write(join(DIR, "summary-baseline.json"), JSON.stringify(baseline, null, 2) + "\n");
  if (!mem.length) return;

  const m = stats(mem, bucket);
  const first = m.buckets[0]!, last = m.buckets.at(-1)!;
  const rec = m.ok.filter((r) => r.recalled);
  // Same tickets in the baseline, so "vs baseline" compares like with like.
  const baseById = new Map(b.ok.map((r) => [r.id, r]));
  const paired = m.ok.filter((r) => baseById.has(r.id));
  const lastIds = new Set(m.ok.slice(-bucket).map((r) => r.id));
  const normalizers = [...new Set(m.ok.map((r) => r.normalizer))].reduce((o, k) => ({ ...o, [k]: m.ok.filter((r) => r.normalizer === k).length }), {} as Record<string, number>);
  // Gold-workflow agreement (ABCD): does the recalled procedure's action set match the human agent's actions?
  const scope = expressible([...m.ok, ...b.ok].flatMap((r) => [...(r.tools ?? []), ...(r.procedureTools ?? [])]));
  const agree = (xs: Row[], f: (r: Row) => string[] | undefined) => {
    const a = xs.map((r) => agreement(f(r), r.goldActions, scope)).filter((x) => x !== undefined);
    if (!a.length) return undefined;
    const miss = new Map<string, number>(), extra = new Map<string, number>();
    for (const x of a) { for (const m of x!.missing) miss.set(m, (miss.get(m) ?? 0) + 1); for (const e of x!.extra) extra.set(e, (extra.get(e) ?? 0) + 1); }
    const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((p, q) => q[1] - p[1]).slice(0, 8));
    return { n: a.length, exactMatch: +(a.filter((x) => x!.exact).length / a.length).toFixed(3), meanJaccard: +(a.reduce((s, x) => s + x!.jaccard, 0) / a.length).toFixed(3), topMissing: top(miss), topExtra: top(extra) };
  };
  const goldAgreement = m.ok.some((r) => r.goldActions?.length) ? {
    method: "tool names mapped to ABCD actions (replay/abcd_map.ts); exactMatch = path action set equals the human agent's actions restricted to those our tools can express",
    expressibleActions: [...scope].sort(),
    recalledPaths: agree(rec, (r) => r.procedureTools), // learned procedure vs this ticket's human workflow
    executedTraces: agree(m.ok, (r) => r.tools), // what the agent actually did on every ticket
    ...(base.length ? { baselineTraces: agree(b.ok, (r) => r.tools) } : {}),
  } : undefined;
  const summary = {
    memory: true,
    normalizers,
    tickets: mem.length,
    errors: mem.length - m.ok.length,
    totalCost: +m.ok.reduce((s, r) => s + r.cost, 0).toFixed(3),
    normalizerCost: +m.ok.reduce((s, r) => s + (r.normCost ?? 0), 0).toFixed(4),
    recalled: rec.length,
    recallPrecision: +avg(rec, (r) => +(r.procedureIntent === r.intent)).toFixed(3),
    recalledCost: +avg(rec, (r) => r.cost).toFixed(4),
    exploredCost: +avg(m.ok.filter((r) => !r.recalled), (r) => r.cost).toFixed(4),
    library: {
      size: Math.max(0, ...m.ok.map((r) => r.library ?? 0)),
      created: m.ok.filter((r) => r.learned).length,
      reinforced: m.ok.filter((r) => r.reinforced).length,
      revised: m.ok.filter((r) => r.revised).length,
      distinctGoldIntents: new Set(m.ok.map((r) => r.intent)).size,
    },
    ...(goldAgreement ? { goldAgreement } : {}),
    buckets: m.buckets,
    headline: {
      costPerTicketFirstBucket: first.costPerTicket,
      costPerTicketLastBucket: last.costPerTicket,
      costFirstVsLast: pct(last.costPerTicket, first.costPerTicket),
      timeFirstVsLast: pct(last.secondsPerTicket, first.secondsPerTicket),
      toolCallsFirstVsLast: pct(last.toolCallsPerTicket, first.toolCallsPerTicket),
      recalledInLastBucket: `${Math.round(last.recallRate * 100)}%`,
      librarySize: Math.max(0, ...m.ok.map((r) => r.library ?? 0)),
      recallPrecision: +avg(rec, (r) => +(r.procedureIntent === r.intent)).toFixed(3),
      ...(goldAgreement?.recalledPaths ? { recalledPathsMatchingHumanWorkflow: `${Math.round(goldAgreement.recalledPaths.exactMatch * 100)}%` } : {}),
      ...(baseline ? {
        baselineCostPerTicket: baseline.costPerTicket,
        lastBucketVsBaseline: pct(last.costPerTicket, baseline.costPerTicket),
        sameTicketsVsBaseline: { tickets: paired.length, memoryCost: +avg(paired, (r) => r.cost).toFixed(4), baselineCost: +avg(paired, (r) => baseById.get(r.id)!.cost).toFixed(4), change: pct(avg(paired, (r) => r.cost), avg(paired, (r) => baseById.get(r.id)!.cost)) },
        lastBucketBaselineOverlap: [...lastIds].filter((id) => baseById.has(id)).length,
      } : {}),
    },
    ...(baseline ? { baseline: { ...baseline, buckets: undefined } } : {}),
  };
  await Bun.write(join(DIR, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  console.table(m.buckets);
  console.log(JSON.stringify(summary.headline, null, 2));
}

if (import.meta.main) await summarize(Number(process.argv[process.argv.indexOf("--bucket") + 1]) || 25);
