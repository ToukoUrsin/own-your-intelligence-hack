// Support agent: Claude + GBrain knowledge + mock shop tools. Records a trace of every step.
import Anthropic from "@anthropic-ai/sdk";
import { readPage, searchKb } from "./brain";
import { findOrders, getTracking, issueRefund, reship, sendPart } from "./shop";

const client = new Anthropic();
const MODEL = process.env.SUPPORT_MODEL ?? "claude-opus-5";
const TODAY = "2026-09-27";

const SYSTEM = `You are the customer support agent for Kettle & Co, a small coffee-equipment shop. Today is ${TODAY}.
Always check the company brain (search_kb, read_page) for the relevant policy before acting, and look up the customer's order before promising anything.
Follow policy exactly. Take the action yourself when policy allows it (refund, reship, send part); otherwise explain the next step.
Your final message must contain only the reply to the customer: short and friendly, no internal notes.`;

const tools: Anthropic.Tool[] = [
  { name: "search_kb", description: "Keyword search in the company brain (policies, products, known issues, FAQ, customer notes).", input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "read_page", description: "Read one company brain page by slug.", input_schema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } },
  { name: "find_orders", description: "Find orders by order id or customer email.", input_schema: { type: "object", properties: { orderId: { type: "string" }, email: { type: "string" } } } },
  { name: "get_tracking", description: "Latest carrier scan for a tracking number.", input_schema: { type: "object", properties: { trackingNumber: { type: "string" } }, required: ["trackingNumber"] } },
  { name: "issue_refund", description: "Refund an amount on an order.", input_schema: { type: "object", properties: { orderId: { type: "string" }, amount: { type: "number" }, reason: { type: "string" } }, required: ["orderId", "amount", "reason"] } },
  { name: "reship", description: "Ship items of an order again at no cost.", input_schema: { type: "object", properties: { orderId: { type: "string" }, skus: { type: "array", items: { type: "string" } }, reason: { type: "string" } }, required: ["orderId", "skus", "reason"] } },
  { name: "send_part", description: "Ship a replacement part.", input_schema: { type: "object", properties: { orderId: { type: "string" }, sku: { type: "string" }, reason: { type: "string" } }, required: ["orderId", "sku", "reason"] } },
];

async function runTool(name: string, input: any): Promise<unknown> {
  switch (name) {
    case "search_kb": return searchKb(input.query);
    case "read_page": return readPage(input.slug);
    case "find_orders": return findOrders(input);
    case "get_tracking": return getTracking(input.trackingNumber);
    case "issue_refund": return issueRefund(input.orderId, input.amount, input.reason);
    case "reship": return reship(input.orderId, input.skus, input.reason);
    case "send_part": return sendPart(input.orderId, input.sku, input.reason);
    default: throw new Error(`unknown tool ${name}`);
  }
}

export type Step = { tool: string; input: unknown; output: unknown };
export type Trace = { ticket: string; steps: Step[]; reply: string; ms: number; inputTokens: number; outputTokens: number; modelCalls: number };

export async function handleTicket(ticket: string, hint?: string): Promise<Trace> {
  const started = Date.now();
  const steps: Step[] = [];
  let inputTokens = 0, outputTokens = 0, modelCalls = 0;
  const content = hint ? `${ticket}\n\n<known_path>\n${hint}\n</known_path>` : ticket;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content }];

  while (true) {
    const response = await client.messages.create({ model: MODEL, max_tokens: 16000, system: SYSTEM, tools, messages });
    modelCalls++;
    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "pause_turn") continue;
    if (response.stop_reason !== "tool_use") {
      const reply = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
      return { ticket, steps, reply, ms: Date.now() - started, inputTokens, outputTokens, modelCalls };
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      try {
        const output = await runTool(block.name, block.input);
        steps.push({ tool: block.name, input: block.input, output });
        results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(output) });
      } catch (e) {
        results.push({ type: "tool_result", tool_use_id: block.id, content: String(e), is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
}
