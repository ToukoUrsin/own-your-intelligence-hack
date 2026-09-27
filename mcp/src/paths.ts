// Path memory for the MCP server: recall and save through agent/src/memory.ts (same normalizer, Memorable
// embeddings/extraction and shared procedure store as the replay). Recall re-reads the store every time, so paths
// learned by the replay or another process are visible immediately. Save uses the calls this server actually logged
// for the session (mcp/logs/calls.jsonl since the last recall_path), not the agent's self-reported list.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as memory from "../../agent/src/memory";
import type { Step } from "../../agent/src/agent";
import { shopTools } from "./tools";

const THRESHOLD = Number(process.env.RECALL_THRESHOLD ?? 0.78);
const LOG = join(import.meta.dir, "../logs/calls.jsonl");

export type ToolCall = { name: string; input?: unknown; result?: unknown };

// QM namespaces MCP tools as "<serverId>_<tool>"; store the bare tool names.
const TOOLS = [...shopTools.map((t) => t.name), "recall_path", "save_path"];
function bare(name: string) {
  return TOOLS.find((t) => name === t || name.endsWith(`_${t}`)) ?? name;
}

const parse = (s: unknown) => { if (typeof s !== "string") return s; try { return JSON.parse(s); } catch { return s; } };

// The current session's calls: everything logged after the most recent recall_path (the MCP is stateless, and the
// agent is told to call recall_path first for each request).
function loggedSession(): Step[] {
  if (!existsSync(LOG)) return [];
  const rows = readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  let start = 0;
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].tool === "recall_path") { start = i + 1; break; }
  return rows.slice(start)
    .filter((r: any) => r.ok && r.tool !== "recall_path" && r.tool !== "save_path")
    .map((r: any) => ({ tool: bare(r.tool), input: r.args ?? {}, output: parse(r.output) }));
}

export async function recallPath(request: string) {
  memory.reload();
  const normalized = await memory.normalize(request);
  // Reuse gate (agent/src/memory.ts): uncertain or multi-part requests go to the full agent, no path is offered.
  const gate = memory.gateReason(request, normalized);
  if (gate) return { found: false, gated: true, gate_reason: gate, normalized: normalized.request, normalizer: normalized.source, confidence: normalized.confidence ?? null, instruction: "Uncertain or multi-part request: do not reuse a saved path. Explore with search_kb, read_page and the shop tools for each request, then call save_path only for a single clear request." };
  const r = await memory.recall(normalized.request);
  const hit = r.procedure && r.similarity >= THRESHOLD ? r.procedure : undefined;
  const common = { similarity: round(r.similarity), normalized: normalized.request, normalizer: normalized.source, backend: r.backend };
  if (!hit) return { found: false, ...common, closest: r.procedure?.title ?? null, instruction: "No saved procedure. Explore with search_kb, read_page and the shop tools, then call save_path." };
  return {
    found: true,
    id: hit.id,
    title: hit.title,
    ...common,
    steps: hit.path,
    tools: hit.tools ?? hit.memorableSteps?.map((m: any) => m.action) ?? [],
    uses: hit.uses ?? 0,
    learnedFrom: (hit as any).learnedFrom ?? null,
    earlierTickets: earlierTickets(hit.id, (hit as any).learnedFrom),
    knowledge: hit.knowledge,
    instruction: "Replay these steps for this customer. The policy text is included, so skip search_kb; make independent calls together. Deviate only if a result shows this is a different case.",
  };
}

export async function savePath(task: string, toolCalls: ToolCall[]) {
  memory.reload();
  let steps = loggedSession();
  const source = steps.length ? "server log" : "agent report";
  if (!steps.length)
    steps = toolCalls
      .map((c) => ({ tool: bare(c.name), input: (c.input ?? {}) as Record<string, unknown>, output: c.result }))
      .filter((s) => s.tool !== "recall_path" && s.tool !== "save_path");
  if (!steps.length) return { saved: false, reason: "no tool calls to save" };
  const normalized = await memory.normalize(task);
  const r = await memory.recall(normalized.request);
  if (r.procedure && (r.similarity >= 0.95)) {
    const { procedure } = await memory.saveProcedure({ sessionId: "qm-chat", normalized, steps, harness: "northwind-support-agent-qm" });
    return { saved: false, reason: "already known (reinforced)", id: procedure?.id ?? r.procedure.id, title: procedure?.title ?? r.procedure.title };
  }
  const { procedure, created } = await memory.saveProcedure({ sessionId: "qm-chat", normalized, steps, embedding: r.embedding, harness: "northwind-support-agent-qm" });
  return { saved: created, id: procedure?.id, title: procedure?.title, steps: procedure?.path, calls: steps.length, callsFrom: source, normalizer: normalized.source };
}

// Earlier replay tickets that learned or reused this path (replay/results.jsonl + data/tickets.jsonl), for the Paths panel.
function readJsonl(file: string): any[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
}
function earlierTickets(id: string, learnedFrom?: string) {
  try {
    const root = join(import.meta.dir, "../..");
    const text = new Map(readJsonl(join(root, "data/tickets.jsonl")).map((t) => [t.id, String(t.text ?? "")]));
    const rows = readJsonl(join(root, "replay/results.jsonl")).filter((r) => r.tier !== "error" && (r.learned === id || r.reinforced === id || r.procedureId === id));
    const ids = [...new Set([...(learnedFrom ? [learnedFrom] : []), ...rows.map((r) => r.id)])];
    return ids.slice(0, 8).map((t) => {
      const row = rows.find((r) => r.id === t);
      return { id: t, text: (text.get(t) ?? "").replace(/\s+/g, " ").slice(0, 90), tier: row?.tier ?? (t === learnedFrom ? "explored" : undefined) };
    });
  } catch { return []; }
}

const round = (n: number) => Math.round(n * 1000) / 1000;
