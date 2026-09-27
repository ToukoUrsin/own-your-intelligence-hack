// Procedure store backed by Memorable itself (RECALL_BACKEND=memorable).
// save → `memorable ingest -`: the procedure's path becomes a trace, Memorable's service extracts, titles and
// judges it, and the admitted procedure lands in the workspace (memorable.sh/dash) and the CLI store.
// recall → `memorable recall "<rendered request>"`: Memorable's exact/lexical/semantic tiers, fused.
// The CLI runs with MEMORABLE_HOME scoped to this project, so consent and store never touch ~/.memorable.
// Needs MEMORABLE_API_KEY in the environment (inject with hsec, never write it to disk).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Procedure } from "./memory";

export type Recalled = { procedure?: Procedure; similarity: number; slug?: string; tiers?: string[] };
export interface ProcedureStore {
  recall(rendered: string): Promise<Recalled>;
  save(procedure: Procedure): Promise<{ stored: boolean; slug?: string; note: string }>;
}

const HOME = process.env.MEMORABLE_HOME ?? join(import.meta.dir, "../../.memorable-home");
const BIN = (process.env.MEMORABLE_BIN ?? "npx -y memorable-cli@0.5.30").split(" ");
// Memorable keeps the steps; the replayable Kettle procedure (path + policy knowledge) is kept beside it by slug.
const MAP = join(HOME, "kettle-procedures.json");

function env() {
  return {
    ...process.env,
    MEMORABLE_HOME: HOME,
    MEMORABLE_NO_KEYCHAIN: "1",
    MEMORABLE_API_URL: process.env.MEMORABLE_API_URL ?? "https://memorable-extraction-api.memorable.workers.dev",
  };
}

async function cli(args: string[], stdin?: string): Promise<{ code: number; out: string }> {
  mkdirSync(HOME, { recursive: true });
  const p = Bun.spawn([...BIN, ...args], { env: env(), stdin: stdin ? new TextEncoder().encode(stdin) : "ignore", stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  return { code: await p.exited, out: (out + err).trim() };
}

const loadMap = (): Record<string, Procedure> => (existsSync(MAP) ? JSON.parse(readFileSync(MAP, "utf8")) : {});
const saveMap = (m: Record<string, Procedure>) => writeFileSync(MAP, JSON.stringify(m, null, 1), { mode: 0o600 });

// Memorable admits traces that end in a verified command and use more than one verb, so each path step is
// sent as the command it stands for, and the reply is the final, successful step (tagged with the intent,
// which keeps procedures with the same tools from collapsing into one revision).
export function toTrace(p: Procedure) {
  const cmd = (step: string) => step.replace(/ \((.*)\)$/, ' --from "$1"');
  const steps = p.path.length ? p.path.map(cmd) : p.tools.map((t) => t);
  return {
    session_id: `kettle-${p.id}-${p.key ? p.key.replace(/\W+/g, "-").slice(0, 60) : Date.now()}`,
    task_description: (p.key ?? p.task).slice(0, 200),
    prompt: (p.key ?? p.task).slice(0, 200),
    harness: "kettle-support-agent",
    tool_calls: [
      ...steps.map((command) => ({ name: "Bash", input: { command }, result: { exit_code: 0 } })),
      { name: "Bash", input: { command: `send_reply --intent ${p.intent ?? p.title}` }, result: { exit_code: 0 } },
    ],
  };
}

export const memorableStore: ProcedureStore = {
  async save(procedure) {
    const r = await cli(["ingest", "-"], JSON.stringify(toTrace(procedure)));
    const slug = /stored ([^\s,]+)/.exec(r.out)?.[1];
    if (r.code !== 0 || !slug) return { stored: false, note: r.out };
    const m = loadMap();
    m[slug] = { ...procedure, embedding: [] };
    saveMap(m);
    return { stored: true, slug, note: r.out };
  },
  async recall(rendered) {
    const r = await cli(["recall", "--single", rendered]);
    // Lines look like: "0.673  procedures/<slug>  [lexical,semantic]"; the first is Memorable's pick.
    const top = /^\s*([\d.]+)\s+(\S+)\s+\[([^\]]*)\]/m.exec(r.out);
    if (!top) return { similarity: 0 };
    const [, score, slug, tiers] = top;
    return { procedure: loadMap()[slug], similarity: Number(score), slug, tiers: tiers.split(",") };
  },
};

export const recallBackend = () => (process.env.RECALL_BACKEND === "memorable" ? "memorable" : "local");
