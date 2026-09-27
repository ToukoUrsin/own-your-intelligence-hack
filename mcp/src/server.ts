// Northwind Outfitters support tools as a Streamable-HTTP MCP server (stateless, JSON responses) for QM.
// Exposes the support agent's tools (mirrored in tools.ts) plus recall_path / save_path.
// Every tools/call is logged with timing to mcp/logs/calls.jsonl.
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { recallPath, savePath } from "./paths";
import { runShopTool, shopTools } from "./tools";

const PORT = Number(process.env.MCP_PORT ?? 8790);
const LOG_DIR = join(import.meta.dir, "../logs");
const LOG = join(LOG_DIR, "calls.jsonl");
mkdirSync(LOG_DIR, { recursive: true });

const memoryTools = [
  {
    name: "recall_path",
    description: "Look up a saved procedure (path) for a customer request. Pass a short standardized version of the request without names or ids, e.g. 'order not delivered, check tracking'. Returns the steps to replay, or found=false.",
    inputSchema: { type: "object", properties: { request: { type: "string" } }, required: ["request"] },
  },
  {
    name: "save_path",
    description: "Save the procedure that resolved a request so similar tickets can replay it. task: the standardized request; tool_calls: the tools you called, in order, with their inputs (results optional).",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string" },
        tool_calls: { type: "array", items: { type: "object", properties: { name: { type: "string" }, input: { type: "object" }, result: {} }, required: ["name"] } },
      },
      required: ["task", "tool_calls"],
    },
  },
];
const allTools = [...memoryTools, ...shopTools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.input_schema }))];

async function dispatch(name: string, args: any): Promise<unknown> {
  if (name === "recall_path") return recallPath(String(args.request ?? ""));
  if (name === "save_path") return savePath(String(args.task ?? ""), Array.isArray(args.tool_calls) ? args.tool_calls : []);
  return runShopTool(name, args);
}

function build() {
  const server = new Server({ name: "northwind-support", version: "0.2.0" }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: allTools }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name } = req.params;
    const args = req.params.arguments ?? {};
    const started = Date.now();
    let ok = true;
    let output: unknown;
    try {
      output = await dispatch(name, args);
    } catch (e) {
      ok = false;
      output = { error: e instanceof Error ? e.message : String(e) };
    }
    const ms = Date.now() - started;
    const text = typeof output === "string" ? output : JSON.stringify(output) ?? "null";
    appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), tool: name, args, ms, ok, output: text.slice(0, 4000) }) + "\n");
    console.log(`${name} ${ms}ms ${ok ? "ok" : "error"}`);
    return { content: [{ type: "text", text }], ...(ok ? {} : { isError: true }) };
  });
  return server;
}

Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  idleTimeout: 120,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") return Response.json({ ok: true, tools: allTools.length });
    if (url.pathname !== "/mcp") return new Response("not found", { status: 404 });
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await build().connect(transport);
    return transport.handleRequest(req);
  },
});
console.log(`northwind-support MCP on http://127.0.0.1:${PORT}/mcp (${allTools.length} tools)`);
