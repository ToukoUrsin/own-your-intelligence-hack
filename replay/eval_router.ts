// Router hit-rate eval on data/heldout.jsonl (100 messy tickets never seen in training or replay).
// For each normalizer, build the procedure library the replay would build: one procedure per intent, learned from the
// first ticket of that intent in data/tickets.jsonl and filed under that normalizer's standardized request. Then
// normalize each held-out ticket, recall (exact key, else nearest embedding) and check recalled intent == gold intent.
// bun replay/eval_router.ts   (NORMALIZER is ignored; raw + haiku always run, river when ROUTER_URL is set)
import { join } from "node:path";
import { cosine, embed, normalize, renderIntent, type Normalized, type Normalizer } from "../agent/src/memory";

const THRESHOLD = Number(process.env.RECALL_THRESHOLD ?? 0.8);
const C = 8;
type Ticket = { id: string; text: string; intent: string };
const readJsonl = async (f: string): Promise<Ticket[]> => (await Bun.file(join(import.meta.dir, f)).text()).split("\n").filter(Boolean).map((l) => JSON.parse(l));
const tickets = await readJsonl("../data/tickets.jsonl");
const heldout = await readJsonl("../data/heldout.jsonl");

async function pool<T, R>(xs: T[], f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length);
  let next = 0;
  await Promise.all(Array.from({ length: C }, async () => { while (next < xs.length) { const i = next++; out[i] = await f(xs[i]!); } }));
  return out;
}

type Entry = { key?: string; intent?: string; goldIntent: string; embedding: number[]; from: string };
const firstPerIntent: Ticket[] = [];
for (const t of tickets) if (!firstPerIntent.some((x) => x.intent === t.intent)) firstPerIntent.push(t);

async function standardize(text: string, which: Normalizer): Promise<Normalized> {
  if (which === "raw") return { request: text, standardized: false, source: "raw" };
  return normalize(text, which);
}

// curated: each procedure filed under the rendering of its gold label (isolates routing from library-learning noise).
async function buildLibrary(which: Normalizer, source: Ticket[], curated = false): Promise<Entry[]> {
  const items = await pool(source, async (t) => {
    const n: Normalized = curated ? { request: renderIntent(t.intent)!, standardized: true, intent: t.intent, source: which } : await standardize(t.text, which);
    return { n, t, embedding: await embed(n.request) };
  });
  const lib: Entry[] = [];
  for (const { n, t, embedding } of items) {
    const key = n.standardized ? n.request : undefined;
    if (key && lib.some((e) => e.key === key)) continue; // the replay reinforces instead of filing a duplicate
    lib.push({ key, intent: n.intent, goldIntent: t.intent, embedding, from: t.id });
  }
  return lib;
}

function recallFrom(lib: Entry[], n: Normalized, embedding: number[]) {
  const keyed = n.standardized ? lib.find((e) => e.key === n.request) : undefined;
  if (keyed) return { entry: keyed, similarity: 1 };
  let entry: Entry | undefined, similarity = 0;
  for (const e of lib) {
    if (n.intent && e.intent && e.intent !== n.intent) continue;
    const s = cosine(embedding, e.embedding);
    if (s > similarity) { similarity = s; entry = e; }
  }
  return { entry, similarity };
}

async function evaluate(which: Normalizer, librarySource: Ticket[], label: string, curated = false) {
  const started = Date.now();
  const lib = await buildLibrary(which, librarySource, curated);
  const rows = await pool(heldout, async (h) => {
    const n = await standardize(h.text, which);
    const embedding = await embed(n.request);
    const r = recallFrom(lib, n, embedding);
    const recalled = !!r.entry && r.similarity >= THRESHOLD;
    return {
      id: h.id, gold: h.intent, normalizedTo: n.intent ?? null, fellBackToRaw: which !== "raw" && !n.standardized,
      top1: r.entry?.goldIntent ?? null, similarity: +r.similarity.toFixed(3), recalled,
      hit: recalled && r.entry!.goldIntent === h.intent, wrongRecall: recalled && r.entry!.goldIntent !== h.intent,
    };
  });
  const n = rows.length, count = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).length;
  const res = {
    normalizer: which, library: label, librarySize: lib.length, heldout: n,
    hitRate: +(count((r) => r.hit) / n).toFixed(3), // recalled a procedure (at threshold or by key) of the gold intent
    top1Accuracy: +(count((r) => r.top1 === r.gold) / n).toFixed(3), // nearest procedure's intent, ignoring the threshold
    wrongRecallRate: +(count((r) => r.wrongRecall) / n).toFixed(3), // would replay a path of another intent
    missRate: +(count((r) => !r.recalled) / n).toFixed(3), // explores from scratch
    ...(which !== "raw" ? { labelAccuracy: +(count((r) => r.normalizedTo === r.gold) / n).toFixed(3), fellBackToRaw: count((r) => r.fellBackToRaw) } : {}),
    seconds: Math.round((Date.now() - started) / 1000),
    rows,
  };
  console.log(`${which.padEnd(6)} ${label.padEnd(28)} lib=${res.librarySize} hit=${res.hitRate} top1=${res.top1Accuracy} wrong=${res.wrongRecallRate} miss=${res.missRate}${"labelAccuracy" in res ? ` label=${res.labelAccuracy}` : ""}`);
  return res;
}

const runs = [
  await evaluate("raw", firstPerIntent, "first ticket per intent"),
  await evaluate("raw", tickets, "all 400 replay tickets (kNN)"),
  await evaluate("haiku", firstPerIntent, "first ticket per intent"),
  await evaluate("haiku", firstPerIntent, "curated: filed by gold label", true),
];
if (process.env.ROUTER_URL) {
  runs.push(await evaluate("river", firstPerIntent, "first ticket per intent"));
  runs.push(await evaluate("river", firstPerIntent, "curated: filed by gold label", true));
}

const out = {
  generatedAt: new Date().toISOString(),
  threshold: THRESHOLD,
  metric: "hitRate = recalled procedure's intent == gold intent on data/heldout.jsonl (100 tickets); recall = exact standardized key, else cosine >= threshold on Memorable bge-m3 embeddings",
  river: process.env.ROUTER_URL ? "evaluated" : "ROUTER_URL not set",
  results: runs.map(({ rows, ...r }) => r),
  rows: Object.fromEntries(runs.map((r) => [`${r.normalizer}:${r.library}`, r.rows])),
};
await Bun.write(join(import.meta.dir, "router-eval.json"), JSON.stringify(out, null, 2) + "\n");
