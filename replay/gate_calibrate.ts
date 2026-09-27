// Router-confidence calibration for the reuse gate: River confidence on heldout (router label vs gold) and on the
// final run (recalled procedure's gold intent vs ticket's gold intent). bun replay/gate_calibrate.ts > replay/gate-calibration.json
const URL = process.env.ROUTER_URL ?? "http://127.0.0.1:8789/route";
const rd = async (p: string) => (await Bun.file(p).text()).split("\n").filter(Boolean).map((l) => JSON.parse(l));
const route = async (text: string): Promise<any> => { for (let a = 0; ; a++) { try { return await (await fetch(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) })).json(); } catch (e) { if (a > 4) return {}; await Bun.sleep(1000 * (a + 1)); } } };
const tickets = new Map([...(await rd("data/tickets.jsonl")), ...(await rd("data/hard_tickets.jsonl"))].map((t: any) => [t.id, t]));
const held = await rd("data/heldout.jsonl");
const runRows = await rd("replay/results.jsonl");
const conf = async (t: any) => route(t.email ? `${t.text}\n\n(from: ${t.email})`.split("\n\n(from:")[0] : t.text);
const out: any = { heldout: [], run: [] };
const pool = async <T,>(xs: T[], f: (x: T) => Promise<void>, c = 24) => { let k = 0; await Promise.all(Array.from({ length: c }, async () => { while (k < xs.length) await f(xs[k++]!); })); };
await pool(held, async (t: any) => { const r = await conf(t); out.heldout.push({ id: t.id, conf: r.confidence, intent: r.intent, gold: t.intent, correct: r.intent === t.intent }); });
if (process.env.RUN_TOO) await pool(runRows, async (row: any) => { const t = tickets.get(row.id); const r = await conf(t); out.run.push({ id: row.id, hard: !!row.hard, tier: row.tier, conf: r.confidence, routerIntent: r.intent, gold: row.intent, procIntent: row.procedureIntent, correct: row.tier === "recalled" ? row.procedureIntent === row.intent : undefined }); });
const ths = [0, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95];
out.curve = ths.map((th) => {
  const h = out.heldout.filter((x: any) => x.conf >= th);
  const rn = out.run.filter((x: any) => !x.hard && x.tier === "recalled"), rh = out.run.filter((x: any) => x.hard && x.tier !== "compiled");
  const keptN = rn.filter((x: any) => x.conf >= th);
  return { th, heldoutPass: +(h.length / out.heldout.length).toFixed(3), heldoutPrecision: +(h.filter((x: any) => x.correct).length / (h.length || 1)).toFixed(3),
    normalRecallsKept: +(keptN.length / rn.length).toFixed(3), correctNormalRecallsKept: +(keptN.filter((x: any) => x.correct).length / rn.filter((x: any) => x.correct).length).toFixed(3),
    wrongNormalRecallsKept: +(keptN.filter((x: any) => !x.correct).length / (rn.filter((x: any) => !x.correct).length || 1)).toFixed(3),
    hardPassing: +(rh.filter((x: any) => x.conf >= th).length / rh.length).toFixed(3) };
});
console.log(JSON.stringify(out, null, 1));
console.error(JSON.stringify(out.curve, null, 0).replaceAll("},{", "}\n{"));
