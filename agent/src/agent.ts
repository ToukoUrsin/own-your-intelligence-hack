// Support agent: Claude + GBrain knowledge + mock shop tools. Records a trace of every step.
import Anthropic from "@anthropic-ai/sdk";
import { readPage, searchKb } from "./brain";
import * as shop from "./shop";

const client = new Anthropic();
const MODEL = process.env.SUPPORT_MODEL ?? "claude-opus-5";
const TODAY = "2026-09-27";

const SYSTEM = `You are the customer support agent for Kettle & Co, an online shop for coffee equipment and beans (orders, shipping, refunds, invoices, payments, accounts, newsletter). Today is ${TODAY}.
Tickets start with a "From:" line: that is the sender's account email. Use it to look up the customer and their orders when the ticket has no order number; ask the customer only for what you cannot look up.
Always check the company brain (search_kb, read_page) for the relevant procedure or policy before acting, and look up the customer's data before promising anything.
Follow policy exactly. Take the action yourself when policy allows it; otherwise explain the next step.
Your final message must contain only the reply to the customer: short and friendly, no internal notes, no placeholders.`;

const str = { type: "string" } as const;
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object" as const, properties, required });

const tools: Anthropic.Tool[] = [
  { name: "search_kb", description: "Keyword search in the company brain (procedures per request type, policies, products, known issues, FAQ, customer notes).", input_schema: obj({ query: str }, ["query"]) },
  { name: "read_page", description: "Read one company brain page by slug.", input_schema: obj({ slug: str }, ["slug"]) },
  { name: "find_customer", description: "Customer account by email (plan, default address, saved payment methods, newsletter), or search by name.", input_schema: obj({ email: str, name: str }) },
  { name: "find_orders", description: "Find orders by order id or customer email. Includes status, items, payment status, invoice id and tracking number.", input_schema: obj({ orderId: str, email: str }) },
  { name: "get_tracking", description: "Latest carrier scan and ETA for a tracking number.", input_schema: obj({ trackingNumber: str }, ["trackingNumber"]) },
  { name: "list_products", description: "Product catalog with SKUs and prices.", input_schema: obj({}) },
  { name: "place_order", description: "Place an order for an existing customer with their default address and first saved payment method.", input_schema: obj({ email: str, items: { type: "array", items: obj({ sku: str, qty: { type: "number" } }, ["sku"]) } }, ["email", "items"]) },
  { name: "cancel_order", description: "Cancel a processing order and refund it in full.", input_schema: obj({ orderId: str, reason: str }, ["orderId", "reason"]) },
  { name: "edit_order", description: "Add or remove SKUs on a processing order.", input_schema: obj({ orderId: str, addSkus: { type: "array", items: str }, removeSkus: { type: "array", items: str } }, ["orderId"]) },
  { name: "change_shipping_address", description: "Change the shipping address of a processing order.", input_schema: obj({ orderId: str, address: str }, ["orderId", "address"]) },
  { name: "update_account", description: "Update account details: name, phone, default shipping address, or email (sends a confirmation link to the new email).", input_schema: obj({ email: str, name: str, phone: str, defaultAddress: str, newEmail: str }, ["email"]) },
  { name: "change_plan", description: "Switch a customer between the Standard and Plus plans.", input_schema: obj({ email: str, plan: { type: "string", enum: ["Standard", "Plus"] } }, ["email", "plan"]) },
  { name: "set_newsletter", description: "Subscribe or unsubscribe an email from the newsletter.", input_schema: obj({ email: str, subscribed: { type: "boolean" } }, ["email", "subscribed"]) },
  { name: "send_password_reset", description: "Email a password reset link to an account email.", input_schema: obj({ email: str }, ["email"]) },
  { name: "create_account", description: "Create a Standard account and send a verification email.", input_schema: obj({ email: str, name: str }, ["email", "name"]) },
  { name: "request_account_deletion", description: "Start account deletion (confirmation email, deleted 14 days after confirmation).", input_schema: obj({ email: str }, ["email"]) },
  { name: "get_refunds", description: "Refunds and their status by order id or customer email.", input_schema: obj({ orderId: str, email: str }) },
  { name: "issue_refund", description: "Refund an amount on an order to its original payment method.", input_schema: obj({ orderId: str, amount: { type: "number" }, reason: str }, ["orderId", "amount", "reason"]) },
  { name: "get_invoices", description: "Invoices by invoice id, order id or customer email (amount, status, PDF link).", input_schema: obj({ invoiceId: str, orderId: str, email: str }) },
  { name: "email_invoice", description: "Email an invoice PDF to the account email.", input_schema: obj({ invoiceId: str }, ["invoiceId"]) },
  { name: "create_case", description: "Hand off to a human team: type complaint, feedback, callback, payment, sales or bug.", input_schema: obj({ email: str, type: str, summary: str }, ["email", "type", "summary"]) },
  { name: "reship", description: "Ship items of an order again at no cost.", input_schema: obj({ orderId: str, skus: { type: "array", items: str }, reason: str }, ["orderId", "skus", "reason"]) },
  { name: "send_part", description: "Ship a replacement part.", input_schema: obj({ orderId: str, sku: str, reason: str }, ["orderId", "sku", "reason"]) },
];

async function runTool(name: string, input: any): Promise<unknown> {
  switch (name) {
    case "search_kb": return searchKb(input.query);
    case "read_page": return readPage(input.slug);
    case "find_customer": return shop.findCustomer(input);
    case "find_orders": return shop.findOrders(input);
    case "get_tracking": return shop.getTracking(input.trackingNumber);
    case "list_products": return shop.listProducts();
    case "place_order": return shop.placeOrder(input.email, input.items);
    case "cancel_order": return shop.cancelOrder(input.orderId, input.reason);
    case "edit_order": return shop.editOrder(input.orderId, input.addSkus, input.removeSkus);
    case "change_shipping_address": return shop.changeShippingAddress(input.orderId, input.address);
    case "update_account": { const { email, ...changes } = input; return shop.updateAccount(email, changes); }
    case "change_plan": return shop.changePlan(input.email, input.plan);
    case "set_newsletter": return shop.setNewsletter(input.email, input.subscribed);
    case "send_password_reset": return shop.sendPasswordReset(input.email);
    case "create_account": return shop.createAccount(input.email, input.name);
    case "request_account_deletion": return shop.requestAccountDeletion(input.email);
    case "get_refunds": return shop.getRefunds(input);
    case "issue_refund": return shop.issueRefund(input.orderId, input.amount, input.reason);
    case "get_invoices": return shop.getInvoices(input);
    case "email_invoice": return shop.emailInvoice(input.invoiceId);
    case "create_case": return shop.createCase(input.email, input.type, input.summary);
    case "reship": return shop.reship(input.orderId, input.skus, input.reason);
    case "send_part": return shop.sendPart(input.orderId, input.sku, input.reason);
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
