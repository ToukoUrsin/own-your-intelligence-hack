// Support agent (Northwind Outfitters): Claude + GBrain knowledge + mock shop tools mirroring the ABCD agent actions. Records a trace of every step.
import Anthropic from "@anthropic-ai/sdk";
import { readPage, searchKb } from "./brain";
import * as shop from "./shop";

const client = new Anthropic();
const MODEL = process.env.SUPPORT_MODEL ?? "claude-opus-5";
const TODAY = "2026-09-27";

const SYSTEM = `You are the customer support agent for Northwind Outfitters, an online clothing retailer (jeans, shirts, boots, jackets in the Mercer, Kline, Gale and Harbor lines). Today is ${TODAY}.
The ticket includes the sender's account email (a "From:" line or "(from: ...)"). Use it to pull up the account when the customer gives no name or account ID; ask the customer only for what you cannot look up.
Always check the company brain (search_kb, read_page) for the procedure of this request type (procedures/<flow>-<subflow>) and follow its required actions in order, using the matching tools. Look up the customer's data before promising anything.
Follow policy exactly, including membership-level rules. Take the action yourself when policy allows it; otherwise explain the next step.
Your final message must contain only the reply to the customer: short and friendly, no internal notes, no placeholders.`;

const str = { type: "string" } as const;
const num = { type: "number" } as const;
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object" as const, properties, required });

const tools: Anthropic.Tool[] = [
  { name: "search_kb", description: "Keyword search in the company brain (procedures per request type, policies, FAQ answers, products).", input_schema: obj({ query: str }, ["query"]) },
  { name: "read_page", description: "Read one company brain page by slug.", input_schema: obj({ slug: str }, ["slug"]) },
  { name: "pull_up_account", description: "Pull up a customer account by full name or account ID (email or username also work). Returns membership, username, account ID, subscription, credit and orders.", input_schema: obj({ name: str, accountId: str, email: str, username: str }) },
  { name: "verify_identity", description: "Verify identity with full name and/or account ID plus order ID (zip code optional).", input_schema: obj({ name: str, accountId: str, orderId: str, zip: str }, ["orderId"]) },
  { name: "validate_purchase", description: "Confirm a purchase is valid: username + email + order ID.", input_schema: obj({ username: str, email: str, orderId: str }, ["orderId"]) },
  { name: "find_orders", description: "Find orders by order id or customer email (status, shipping status, items, payment, tracking).", input_schema: obj({ orderId: str, email: str }) },
  { name: "shipping_status", description: "Shipping status of an order (order received / in transit / out for delivery / delivered) with the latest carrier scan.", input_schema: obj({ orderId: str }, ["orderId"]) },
  { name: "check_system", description: "Ask the system a yes/no question about a disputed fact (e.g. was this fee/charge/credit/code our error). Yes = company error.", input_schema: obj({ email: str, orderId: str, question: str }, ["question"]) },
  { name: "membership", description: "Record the customer's membership level (gold/silver/bronze/guest) and get its privileges.", input_schema: obj({ email: str, level: str }) },
  { name: "subscription_status", description: "Premium subscription status, amount due and due date.", input_schema: obj({ email: str }, ["email"]) },
  { name: "record_reason", description: "Record the reason or key fact on the case (return reason, days waited, refund method, competitor, etc.).", input_schema: obj({ email: str, orderId: str, reason: str }, ["reason"]) },
  { name: "enter_details", description: "Enter details on the case (address, account ID, username, email, PIN, security answer, amount, troubleshoot).", input_schema: obj({ email: str, orderId: str, details: str }, ["details"]) },
  { name: "offer_refund", description: "Refund an amount: method credit card (original payment, needs orderId), add value (account credit), gift card or paper check (mailed).", input_schema: obj({ email: str, orderId: str, amount: num, method: { type: "string", enum: ["credit card", "add value", "gift card", "paper check"] }, reason: str }, ["amount"]) },
  { name: "update_order", description: "Update an order: change address|change date|change item|change method|change order|change price|cancel shipment|waive fee|give credit, or return method by mail|in store|drop off center.", input_schema: obj({ orderId: str, change: str, value: str, amount: num }, ["orderId", "change"]) },
  { name: "update_account", description: "Update profile: name, phone, default address, or email (sends a confirmation link to the new email).", input_schema: obj({ email: str, name: str, phone: str, defaultAddress: str, newEmail: str }, ["email"]) },
  { name: "update_subscription", description: "Account subscription/services change: add service|remove service|extend subscription|renew subscription|pay bill (amount)|change payment method (value).", input_schema: obj({ email: str, change: str, value: str, amount: num }, ["email", "change"]) },
  { name: "make_purchase", description: "Order one product for the customer (SKU or name like 'Mercer jeans'), e.g. a replacement or an order they could not place online.", input_schema: obj({ email: str, product: str, freeShipping: { type: "boolean" } }, ["email", "product"]) },
  { name: "make_password", description: "Generate a temporary password for the account.", input_schema: obj({ email: str, username: str }) },
  { name: "promo_code", description: "Issue a new 7-day promo code.", input_schema: obj({ email: str, reason: str, percent: num }, ["email", "reason"]) },
  { name: "send_link", description: "Email the customer a link (reset two-factor, subscription/billing page, return label, FAQ).", input_schema: obj({ email: str, kind: str }, ["email", "kind"]) },
  { name: "notify_team", description: "Hand off to an internal team: manager, website team or purchasing department.", input_schema: obj({ team: { type: "string", enum: ["manager", "website team", "purchasing department"] }, email: str, summary: str }, ["team", "email", "summary"]) },
  { name: "troubleshoot_step", description: "Record a site troubleshooting step the customer was asked to take: try again, log out and in, clear cache, other browser.", input_schema: obj({ email: str, step: str }, ["email", "step"]) },
  { name: "get_refunds", description: "Refunds and their status by order id or customer email.", input_schema: obj({ orderId: str, email: str }) },
  { name: "list_products", description: "Product catalog with SKUs and prices.", input_schema: obj({}) },
];

async function runTool(name: string, input: any): Promise<unknown> {
  switch (name) {
    case "search_kb": return searchKb(input.query);
    case "read_page": return readPage(input.slug);
    case "pull_up_account": return shop.pullUpAccount(input);
    case "verify_identity": return shop.verifyIdentity(input);
    case "validate_purchase": return shop.validatePurchase(input);
    case "find_orders": return shop.findOrders(input);
    case "shipping_status": return shop.shippingStatus(input.orderId);
    case "check_system": return shop.checkSystem(input);
    case "membership": return shop.membership(input);
    case "subscription_status": return shop.subscriptionStatus(input.email);
    case "record_reason": return shop.recordReason(input);
    case "enter_details": return shop.enterDetails(input);
    case "offer_refund": return shop.offerRefund(input);
    case "update_order": return shop.updateOrder(input.orderId, input.change, input.value, input.amount);
    case "update_account": { const { email, ...changes } = input; return shop.updateAccount(email, changes); }
    case "update_subscription": return shop.updateSubscription(input.email, input.change, input.value, input.amount);
    case "make_purchase": return shop.makePurchase(input.email, input.product, input.freeShipping);
    case "make_password": return shop.makePassword(input);
    case "promo_code": return shop.promoCode(input.email, input.reason, input.percent);
    case "send_link": return shop.sendLink(input.email, input.kind);
    case "notify_team": return shop.notifyTeam(input.team, input.email, input.summary);
    case "troubleshoot_step": return shop.troubleshootStep(input.email, input.step);
    case "get_refunds": return shop.getRefunds(input);
    case "list_products": return shop.listProducts();
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
      // The model occasionally ends a turn without text; ask once more for the customer reply.
      if (!reply.trim() && modelCalls < 12) {
        messages.push({ role: "user", content: "Write the reply to the customer now." });
        continue;
      }
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
