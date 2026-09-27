// Path memory for the MCP server: recall and save through agent/src/memory.ts (Memorable embeddings + shared
// procedure store). memory.ts keeps its own learn() private, so save mirrors it here and pushes into the same
// in-process cache so later recalls see the new path immediately.
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import * as memory from "../../agent/src/memory";
import type { Procedure } from "../../agent/src/memory";
import { shopTools } from "./tools";

const API = process.env.MEMORABLE_API_URL ?? "https://memorable-extraction-api.memorable.workers.dev";
const THRESHOLD = Number(process.env.RECALL_THRESHOLD ?? 0.78);
const STORE = process.env.MEMORY_STORE ?? join(import.meta.dir, "../../replay/procedures.jsonl");

export type ToolCall = { name: string; input?: unknown; result?: unknown };

// QM namespaces MCP tools as "<serverId>_<tool>"; store the bare tool names.
const TOOLS = [...shopTools.map((t) => t.name), "recall_path", "save_path"];
function bare(name: string) {
  return TOOLS.find((t) => name === t || name.endsWith(`_${t}`)) ?? name;
}

async function memorable(path: string, body: unknown): Promise<any> {
  const key = process.env.MEMORABLE_API_KEY;
  if (!key) throw new Error("MEMORABLE_API_KEY missing");
  const r = await fetch(new URL(path, API), {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`memorable ${path}: ${r.status}`);
  return r.json();
}

function toPath(steps: { tool: string; input: Record<string, unknown> }[]): string[] {
  const readsPages = steps.some((s) => s.tool === "read_page");
  const path: string[] = [];
  for (const s of steps) {
    let line: string;
    if (s.tool === "read_page") line = `read_page ${JSON.stringify({ slug: s.input.slug })}`;
    else if (s.tool === "search_kb") { if (readsPages) continue; line = `search_kb ${JSON.stringify({ query: s.input.query })}`; }
    else line = `${s.tool} (${Object.keys(s.input).join(", ")} from this ticket and its order)`;
    if (!path.includes(line)) path.push(line);
  }
  return path;
}

export async function recallPath(request: string) {
  const normalized = await memory.normalize(request);
  const r = await memory.recall(normalized.request);
  const hit = r.procedure && r.similarity >= THRESHOLD ? r.procedure : undefined;
  if (!hit) return { found: false, similarity: round(r.similarity), closest: r.procedure?.title ?? null, normalized: normalized.request, instruction: "No saved procedure. Explore with search_kb, read_page and the shop tools, then call save_path." };
  return {
    found: true,
    id: hit.id,
    title: hit.title,
    similarity: round(r.similarity),
    normalized: normalized.request,
    steps: hit.path,
    instruction: "Replay these steps for this customer. The brain pages are listed, so skip search_kb; make independent calls together. Deviate only if a result shows this is a different case.",
  };
}

export async function savePath(task: string, toolCalls: ToolCall[]) {
  const steps = toolCalls
    .map((c) => ({ tool: bare(c.name), input: (c.input ?? {}) as Record<string, unknown>, result: c.result }))
    .filter((s) => s.tool !== "recall_path" && s.tool !== "save_path");
  if (!steps.length) return { saved: false, reason: "no tool calls to save" };
  const r = await memory.recall(task);
  if (r.procedure && r.similarity >= 0.95) return { saved: false, reason: "already known", id: r.procedure.id, title: r.procedure.title };
  const res = await memorable("/v1/extract", {
    session_id: `qm-${Date.now()}`,
    task_description: task.slice(0, 200),
    harness: "kettle-support-agent-qm",
    tool_calls: steps.map((s) => ({ name: s.tool, input: s.input, result: JSON.stringify(s.result ?? "").slice(0, 2000) })),
  }).catch(() => null);
  const d = res?.draft;
  const all = await memory.listProcedures();
  const p: Procedure = {
    id: `proc-${all.length + 1}`,
    title: d?.title ?? task,
    task,
    memorableSteps: (d?.steps ?? []).map((s: any) => ({ seq: s.seq, action: s.action, repeat_count: s.repeat_count })),
    admitted: res?.judge?.admitted,
    path: toPath(steps),
    tools: [...new Set(steps.map((s) => s.tool))],
    embedding: d?.embedding?.length ? d.embedding : r.embedding,
    learnedFrom: "qm-chat",
    createdAt: new Date().toISOString(),
  };
  all.push(p);
  mkdirSync(dirname(STORE), { recursive: true });
  appendFileSync(STORE, JSON.stringify(p) + "\n");
  return { saved: true, id: p.id, title: p.title, steps: p.path, memorableDraft: !!d };
}

const round = (n: number) => Math.round(n * 1000) / 1000;
