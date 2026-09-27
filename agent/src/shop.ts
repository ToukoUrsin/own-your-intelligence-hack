// Mock shop backend for Kettle & Co. Synthetic fixtures in data/shop.json; every tool is deterministic.
import fixtures from "../../data/shop.json";

export type Customer = {
  email: string; name: string; plan: "Standard" | "Plus" | "Business"; since: string; defaultAddress: string;
  paymentMethods: string[]; newsletter: boolean; status: "active" | "pending_deletion" | "unverified"; phone?: string;
};
export type Order = {
  id: string; email: string; items: { sku: string; name: string; price: number; serial?: string }[];
  total: number; status: "processing" | "shipped" | "delivered" | "cancelled"; placedAt: string; shipTo: string;
  payment: { method: string; status: string }; invoiceId: string;
  tracking?: string; shippedAt?: string; deliveredAt?: string;
};
export type Refund = { id: string; orderId: string; amount: number; reason: string; status: string; createdAt: string; sentAt?: string; method: string; note?: string };

const TODAY = "2026-09-27";
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export const products: { sku: string; name: string; price: number }[] = fixtures.products;
export const customers: Record<string, Customer> = Object.fromEntries((clone(fixtures.customers) as Customer[]).map((c) => [c.email, c]));
export const orders: Record<string, Order> = Object.fromEntries((clone(fixtures.orders) as Order[]).map((o) => [o.id, o]));
export const refunds: Refund[] = clone(fixtures.refunds);
// Last carrier scan per tracking number.
const tracking: Record<string, { lastScan: string; date: string; delivered: boolean; eta?: string }> = fixtures.tracking;

export const actions: { type: string; orderId: string; detail: string }[] = [];

const norm = (s?: string) => s?.trim().toLowerCase();
const normId = (s?: string) => s?.trim().toUpperCase().replace(/^#/, "");
const log = (type: string, orderId: string, detail: string) => { actions.push({ type, orderId, detail }); return actions.length; };

export function findCustomer(query: { email?: string; name?: string }) {
  if (query.email) return customers[norm(query.email)!] ?? null;
  if (query.name) return Object.values(customers).filter((c) => c.name.toLowerCase().includes(norm(query.name)!));
  return null;
}

export function findOrders(query: { orderId?: string; email?: string }) {
  if (query.orderId) { const o = orders[normId(query.orderId)!]; return o ? [o] : []; }
  if (query.email) return Object.values(orders).filter((o) => o.email === norm(query.email));
  return [];
}

export function getTracking(trackingNumber: string) {
  return tracking[trackingNumber.trim()] ?? null;
}

export function listProducts() {
  return products;
}

export function placeOrder(email: string, items: { sku: string; qty?: number }[]) {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  const lines = items.flatMap(({ sku, qty = 1 }) => { const p = products.find((x) => x.sku === sku); return p ? Array(qty).fill({ ...p }) : []; });
  if (!lines.length) return { ok: false, error: "no valid SKUs" };
  const subtotal = lines.reduce((s, l) => s + l.price, 0);
  const shipping = c.plan !== "Standard" || subtotal > 60 ? 0 : 6;
  const id = `KC-${12000 + Object.keys(orders).length}`;
  orders[id] = { id, email: c.email, items: lines, total: subtotal + shipping, status: "processing", placedAt: TODAY, shipTo: c.defaultAddress, payment: { method: c.paymentMethods[0] ?? "none", status: c.paymentMethods[0] ? "paid" : "failed" }, invoiceId: `INV-${id.slice(3)}` };
  log("place_order", id, `${lines.map((l) => l.sku).join(",")} $${subtotal + shipping}`);
  return { ok: true, order: orders[id] };
}

export function cancelOrder(orderId: string, reason: string) {
  const o = orders[normId(orderId)!];
  if (!o) return { ok: false, error: "order not found" };
  if (o.status !== "processing") return { ok: false, error: `order is ${o.status}; only processing orders can be cancelled` };
  o.status = "cancelled";
  o.payment.status = "refunded";
  const r: Refund = { id: `RF-${log("cancel_order", o.id, reason)}`, orderId: o.id, amount: o.total, reason: `Cancelled: ${reason}`, status: "sent", createdAt: TODAY, sentAt: TODAY, method: o.payment.method };
  refunds.push(r);
  return { ok: true, refund: r };
}

export function editOrder(orderId: string, addSkus: string[] = [], removeSkus: string[] = []) {
  const o = orders[normId(orderId)!];
  if (!o) return { ok: false, error: "order not found" };
  if (o.status !== "processing") return { ok: false, error: `order is ${o.status}; only processing orders can be edited` };
  const before = o.total;
  for (const sku of removeSkus) { const i = o.items.findIndex((x) => x.sku === sku); if (i >= 0) { o.total -= o.items[i]!.price; o.items.splice(i, 1); } }
  for (const sku of addSkus) { const p = products.find((x) => x.sku === sku); if (p) { o.items.push({ ...p }); o.total += p.price; } }
  log("edit_order", o.id, `+${addSkus.join(",")} -${removeSkus.join(",")}`);
  return { ok: true, order: o, priceDifference: o.total - before };
}

export function changeShippingAddress(orderId: string, address: string) {
  const o = orders[normId(orderId)!];
  if (!o) return { ok: false, error: "order not found" };
  if (o.status !== "processing") return { ok: false, error: `order is ${o.status}; label already created, address cannot be changed`, tracking: o.tracking };
  o.shipTo = address;
  log("change_shipping_address", o.id, address);
  return { ok: true, order: o };
}

export function updateAccount(email: string, changes: { name?: string; phone?: string; defaultAddress?: string; newEmail?: string }) {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  const { newEmail, ...rest } = changes;
  Object.assign(c, rest);
  log("update_account", "-", `${c.email}: ${JSON.stringify(changes)}`);
  return { ok: true, customer: c, ...(newEmail ? { emailChange: `confirmation link sent to ${newEmail}` } : {}) };
}

export function changePlan(email: string, plan: "Standard" | "Plus") {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  if (c.plan === plan) return { ok: false, error: `already on ${plan}` };
  if (c.plan === "Business") return { ok: false, error: "Business accounts are changed by sales; create a sales case" };
  const from = c.plan, effective = plan === "Plus" ? TODAY : "2026-10-14";
  log("change_plan", "-", `${c.email}: ${from} → ${plan} from ${effective}`);
  if (plan === "Plus") c.plan = plan;
  return { ok: true, from, to: plan, effective };
}

export function setNewsletter(email: string, subscribed: boolean) {
  const c = customers[norm(email)!];
  if (c) c.newsletter = subscribed;
  log("set_newsletter", "-", `${norm(email)}: ${subscribed}`);
  return { ok: true, email: norm(email), subscribed };
}

export function sendPasswordReset(email: string) {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  log("password_reset", "-", c.email);
  return { ok: true, sentTo: c.email, expiresInMinutes: 30 };
}

export function createAccount(email: string, name: string) {
  if (customers[norm(email)!]) return { ok: false, error: "an account already exists for this email" };
  customers[norm(email)!] = { email: norm(email)!, name, plan: "Standard", since: TODAY, defaultAddress: "", paymentMethods: [], newsletter: false, status: "unverified" };
  log("create_account", "-", norm(email)!);
  return { ok: true, verificationSentTo: norm(email) };
}

export function requestAccountDeletion(email: string) {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  const open = Object.values(orders).filter((o) => o.email === c.email && (o.status === "processing" || o.status === "shipped")).map((o) => o.id);
  c.status = "pending_deletion";
  log("request_account_deletion", "-", c.email);
  return { ok: true, confirmationSentTo: c.email, deletedDaysAfterConfirmation: 14, openOrders: open };
}

export function getRefunds(query: { orderId?: string; email?: string }) {
  const ids = query.orderId ? [normId(query.orderId)] : findOrders({ email: query.email }).map((o) => o.id);
  return refunds.filter((r) => ids.includes(r.orderId));
}

export function issueRefund(orderId: string, amount: number, reason: string) {
  const o = orders[normId(orderId)!];
  if (!o) return { ok: false, error: "order not found" };
  const refunded = refunds.filter((r) => r.orderId === o.id).reduce((s, r) => s + r.amount, 0);
  if (amount + refunded > o.total) return { ok: false, error: `refund exceeds order total ($${o.total - refunded} left)` };
  const r: Refund = { id: `RF-${log("refund", o.id, `$${amount}: ${reason}`)}`, orderId: o.id, amount, reason, status: "sent", createdAt: TODAY, sentAt: TODAY, method: o.payment.method };
  refunds.push(r);
  return { ok: true, refundId: r.id, amount, method: r.method };
}

export function getInvoices(query: { invoiceId?: string; orderId?: string; email?: string }) {
  const list = query.invoiceId ? Object.values(orders).filter((o) => o.invoiceId === normId(query.invoiceId)) : findOrders(query);
  return list.map((o) => ({ invoiceId: o.invoiceId, orderId: o.id, date: o.placedAt, amount: o.total, status: o.payment.status, pdf: `https://kettleandco.example/account/invoices/${o.invoiceId}.pdf` }));
}

export function emailInvoice(invoiceId: string) {
  const o = Object.values(orders).find((x) => x.invoiceId === normId(invoiceId));
  if (!o) return { ok: false, error: "invoice not found" };
  log("email_invoice", o.id, `${o.invoiceId} → ${o.email}`);
  return { ok: true, sentTo: o.email };
}

export function createCase(email: string, type: string, summary: string) {
  const id = `CS-${log("create_case", "-", `${type} ${norm(email)}: ${summary}`)}`;
  return { ok: true, caseId: id, type, reply: type === "callback" ? "a human replies within 2 hours in support hours" : "the team replies within 1–2 business days" };
}

export function reship(orderId: string, skus: string[], reason: string) {
  const o = orders[normId(orderId)!];
  if (!o) return { ok: false, error: "order not found" };
  return { ok: true, newOrderId: `${o.id}-R${log("reship", o.id, `${skus.join(",")}: ${reason}`)}` };
}

export function sendPart(orderId: string, sku: string, reason: string) {
  return { ok: true, shipmentId: `PT-${log("send_part", orderId, `${sku}: ${reason}`)}` };
}
