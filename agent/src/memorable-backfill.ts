// Backfill: ingest every procedure in replay/procedures.jsonl into Memorable (see memorable-store.ts).
// Run: hsec exec --only MEMORABLE_API_KEY -- bun agent/src/memorable-backfill.ts
import { join } from "node:path";
import { memorableStore } from "./memorable-store";
import type { Procedure } from "./memory";

const file = process.argv[2] ?? join(import.meta.dir, "../../replay/procedures.jsonl");
const procs: Procedure[] = (await Bun.file(file).text()).split("\n").filter(Boolean).map((l) => JSON.parse(l));
let stored = 0;
for (const p of procs) {
  const r = await memorableStore.save(p); // sequential: the slug map is one file
  if (r.stored) stored++;
  console.log(`${p.id}\t${r.stored ? r.slug : "NOT STORED: " + r.note.split("\n").pop()}`);
}
console.log(`stored ${stored}/${procs.length}`);
