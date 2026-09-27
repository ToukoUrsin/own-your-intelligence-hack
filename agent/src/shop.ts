// Mock shop backend for Northwind Outfitters (clothing). Fixtures in data/shop.json are built from ABCD scenarios
// (data/build.py); every tool is deterministic. ABCD agent actions (pull-up-account, verify-identity, validate-purchase,
// offer-refund, update-order, ...) are the functions after the generic order/account tools below.
// SHOP_BACKEND=shopify delegates customers, orders, cancellations, refunds, address changes, account updates,
// plans and invoices to the Shopify dev store (./shopify.ts, needs SHOPIFY_ADMIN_TOKEN). Reads stay synchronous
// (served from a cache loaded at import); Shopify writes return Promises (agent.ts and mcp/ await tool results).
// Stay mock even on Shopify, because Shopify cannot represent them (or lacks scopes): carrier scans (get_tracking),
// newsletter, password reset, edit_order (needs write_order_edits), email_invoice (would send real mail),
// create_case, reship, send_part. On the Shopify backend these run against the Shopify-loaded cache.
import fixtures from "../../data/shop.json";
import * as sf from "./shopify";

export const SHOPIFY = process.env.SHOP_BACKEND === "shopify";

export type Customer = {
  email: string; name: string; plan: string; since: string; defaultAddress: string; // plan = membership level: Gold | Silver | Bronze | Guest
  paymentMethods: string[]; newsletter: boolean; status: "active" | "pending_deletion" | "unverified"; phone?: string;
  username?: string; accountId?: string; membership?: string; zip?: string; pin?: string; securityAnswer?: string;
  subscription?: { status: string; plan: string; annualFee: number; dueAmount: number; dueDate: string };
  credit?: number; services?: string[];
};
export type Order = {
  id: string; email: string; items: { sku: string; name: string; price: number; serial?: string }[];
  total: number; status: "processing" | "shipped" | "delivered" | "cancelled"; placedAt: string; shipTo: string;
  payment: { method: string; status: string }; invoiceId: string;
  tracking?: string; shippedAt?: string; deliveredAt?: string;
  shippingStatus?: string; giftPackaging?: boolean; // ABCD: order received | in transit | out for delivery | delivered
};
export type Refund = { id: string; orderId: string; amount: number; reason: string; status: string; createdAt: string; sentAt?: string; method: string; note?: string };

const TODAY = "2026-09-27";
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export const products: { sku: string; name: string; price: number; type?: string; line?: string }[] = fixtures.products;
export const customers: Record<string, Customer> = SHOPIFY ? sf.customers : Object.fromEntries((clone(fixtures.customers) as Customer[]).map((c) => [c.email, c]));
export const orders: Record<string, Order> = SHOPIFY ? sf.orders : Object.fromEntries((clone(fixtures.orders) as Order[]).map((o) => [o.id, o]));
export const refunds: Refund[] = clone(fixtures.refunds);
// Last carrier scan per tracking number.
const tracking: Record<string, { lastScan: string; date: string; delivered: boolean; eta?: string }> = fixtures.tracking;

export const actions: { type: string; orderId: string; detail: string }[] = [];

const norm = (s?: string) => s?.trim().toLowerCase();
const normId = (s?: string) => s?.trim().toUpperCase().replace(/^#/, "");
const log = (type: string, orderId: string, detail: string) => { actions.push({ type, orderId, detail }); return actions.length; };
if (SHOPIFY) await sf.init(log);

export function findCustomer(query: { email?: string; name?: string }) {
  if (SHOPIFY) return sf.findCustomer(query);
  if (query.email) return customers[norm(query.email)!] ?? null;
  if (query.name) return Object.values(customers).filter((c) => c.name.toLowerCase().includes(norm(query.name)!));
  return null;
}

export function findOrders(query: { orderId?: string; email?: string }) {
  if (SHOPIFY) return sf.findOrders(query);
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
  if (SHOPIFY) return sf.placeOrder(email, items);
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  const lines = items.flatMap(({ sku, qty = 1 }) => { const p = products.find((x) => x.sku === sku); return p ? Array(qty).fill({ ...p }) : []; });
  if (!lines.length) return { ok: false, error: "no valid SKUs" };
  const subtotal = lines.reduce((s, l) => s + l.price, 0);
  const shipping = subtotal > 50 ? 0 : 5;
  const id = String(4000000000 + Object.keys(orders).length);
  orders[id] = { id, email: c.email, items: lines, total: subtotal + shipping, status: "processing", placedAt: TODAY, shipTo: c.defaultAddress, payment: { method: c.paymentMethods[0] ?? "none", status: c.paymentMethods[0] ? "paid" : "failed" }, invoiceId: `INV-${id.slice(-6)}`, shippingStatus: "order received" };
  log("place_order", id, `${lines.map((l) => l.sku).join(",")} $${subtotal + shipping}`);
  return { ok: true, order: orders[id] };
}

export function cancelOrder(orderId: string, reason: string) {
  if (SHOPIFY) return sf.cancelOrder(orderId, reason);
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
  if (SHOPIFY) return sf.changeShippingAddress(orderId, address);
  const o = orders[normId(orderId)!];
  if (!o) return { ok: false, error: "order not found" };
  if (o.status !== "processing") return { ok: false, error: `order is ${o.status}; label already created, address cannot be changed`, tracking: o.tracking };
  o.shipTo = address;
  log("change_shipping_address", o.id, address);
  return { ok: true, order: o };
}

export function updateAccount(email: string, changes: { name?: string; phone?: string; defaultAddress?: string; newEmail?: string }) {
  if (SHOPIFY) return sf.updateAccount(email, changes);
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  const { newEmail, ...rest } = changes;
  Object.assign(c, rest);
  log("update_account", "-", `${c.email}: ${JSON.stringify(changes)}`);
  return { ok: true, customer: c, ...(newEmail ? { emailChange: `confirmation link sent to ${newEmail}` } : {}) };
}

export function changePlan(email: string, plan: "Standard" | "Plus") {
  if (SHOPIFY) return sf.changePlan(email, plan);
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
  if (SHOPIFY) return sf.createAccount(email, name);
  if (customers[norm(email)!]) return { ok: false, error: "an account already exists for this email" };
  customers[norm(email)!] = { email: norm(email)!, name, plan: "Guest", membership: "guest", since: TODAY, defaultAddress: "", paymentMethods: [], newsletter: false, status: "unverified" };
  log("create_account", "-", norm(email)!);
  return { ok: true, verificationSentTo: norm(email) };
}

export function requestAccountDeletion(email: string) {
  if (SHOPIFY) return sf.requestAccountDeletion(email);
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  const open = Object.values(orders).filter((o) => o.email === c.email && (o.status === "processing" || o.status === "shipped")).map((o) => o.id);
  c.status = "pending_deletion";
  log("request_account_deletion", "-", c.email);
  return { ok: true, confirmationSentTo: c.email, deletedDaysAfterConfirmation: 14, openOrders: open };
}

export function getRefunds(query: { orderId?: string; email?: string }) {
  if (SHOPIFY) return sf.getRefunds(query);
  const ids = query.orderId ? [normId(query.orderId)] : findOrders({ email: query.email }).map((o) => o.id);
  return refunds.filter((r) => ids.includes(r.orderId));
}

export function issueRefund(orderId: string, amount: number, reason: string) {
  if (SHOPIFY) return sf.issueRefund(orderId, amount, reason);
  const o = orders[normId(orderId)!];
  if (!o) return { ok: false, error: "order not found" };
  const refunded = refunds.filter((r) => r.orderId === o.id).reduce((s, r) => s + r.amount, 0);
  if (amount + refunded > o.total) return { ok: false, error: `refund exceeds order total ($${o.total - refunded} left)` };
  const r: Refund = { id: `RF-${log("refund", o.id, `$${amount}: ${reason}`)}`, orderId: o.id, amount, reason, status: "sent", createdAt: TODAY, sentAt: TODAY, method: o.payment.method };
  refunds.push(r);
  return { ok: true, refundId: r.id, amount, method: r.method };
}

export function getInvoices(query: { invoiceId?: string; orderId?: string; email?: string }) {
  if (SHOPIFY) return sf.getInvoices(query);
  const list = query.invoiceId ? Object.values(orders).filter((o) => o.invoiceId === normId(query.invoiceId)) : findOrders(query);
  return list.map((o) => ({ invoiceId: o.invoiceId, orderId: o.id, date: o.placedAt, amount: o.total, status: o.payment.status, pdf: `https://northwind-outfitters.example/account/invoices/${o.invoiceId}.pdf` }));
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

// ---------- ABCD agent actions ----------
const refundsCredit: { email: string; amount: number; method: string }[] = [];
const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const byUsername = (u?: string) => Object.values(customers).find((c) => c.username === norm(u));
const accountView = (c: Customer) => ({
  name: c.name, email: c.email, username: c.username, accountId: c.accountId, membership: c.membership ?? c.plan?.toLowerCase(),
  phone: c.phone, defaultAddress: c.defaultAddress, paymentMethods: c.paymentMethods, subscription: c.subscription, credit: c.credit ?? 0,
  orders: Object.values(orders).filter((o) => o.email === c.email).map((o) => ({ id: o.id, status: o.status, shippingStatus: o.shippingStatus, total: o.total, items: o.items.map((i) => i.name) })),
});
const who = (q: { email?: string; username?: string; name?: string; accountId?: string }) =>
  (q.email && customers[norm(q.email)!]) || byUsername(q.username) ||
  (q.accountId && Object.values(customers).find((c) => c.accountId?.toLowerCase() === norm(q.accountId))) || undefined;

/** pull-up-account: by full name or account ID (email/username also accepted). Names are not unique; all matches are returned. */
export function pullUpAccount(q: { name?: string; accountId?: string; email?: string; username?: string }) {
  const c = who(q);
  if (c) { log("pull_up_account", "-", c.email); return { found: true, account: accountView(c) }; }
  if (q.name) {
    const m = Object.values(customers).filter((x) => x.name.toLowerCase() === norm(q.name));
    log("pull_up_account", "-", `${q.name}: ${m.length} match(es)`);
    if (m.length === 1) return { found: true, account: accountView(m[0]!) };
    if (m.length) return { found: false, error: `${m.length} accounts share this name; identify by email, username or account ID`, candidates: m.map((x) => ({ email: x.email, username: x.username })) };
  }
  return { found: false, error: "no account found" };
}

/** verify-identity: full name + account ID + order ID (zip code optional). */
export function verifyIdentity(q: { name?: string; accountId?: string; orderId?: string; zip?: string; email?: string }) {
  const o = q.orderId ? orders[normId(q.orderId)!] : undefined;
  const c = o ? customers[o.email] : who(q);
  const checks = {
    name: !!c && !!q.name && c.name.toLowerCase() === norm(q.name),
    accountId: !!c && !!q.accountId && c.accountId?.toLowerCase() === norm(q.accountId),
    order: !!o && (!c || o.email === c.email),
    zip: q.zip ? c?.zip === q.zip.trim() : undefined,
  };
  const verified = checks.order && (checks.name || checks.accountId) && checks.zip !== false;
  log("verify_identity", q.orderId ?? "-", `${verified}`);
  return { verified, checks };
}

/** validate-purchase: username + email + order ID must belong together. */
export function validatePurchase(q: { username?: string; email?: string; orderId: string }) {
  const o = orders[normId(q.orderId)!];
  const c = o ? customers[o.email] : undefined;
  const valid = !!o && !!c && (!q.email || c.email === norm(q.email)) && (!q.username || c.username === norm(q.username));
  log("validate_purchase", q.orderId, `${valid}`);
  return valid ? { valid, order: o } : { valid, error: o ? "username/email do not match this order" : "order not found" };
}

/** ask-the-oracle: the system's yes/no answer for a disputed fact (was the fee/credit/code/charge our error?). */
export function checkSystem(q: { email?: string; orderId?: string; question: string }) {
  const key = `${norm(q.email) ?? ""}|${normId(q.orderId) ?? ""}|${norm(q.question)}`;
  const yes = hash(key) % 3 !== 0;
  log("check_system", q.orderId ?? "-", `${q.question} → ${yes ? "yes" : "no"}`);
  return { answer: yes ? "yes" : "no", meaning: yes ? "system confirms the customer's claim (company error)" : "system does not confirm it (customer error)" };
}

const PRIVILEGES: Record<string, string> = {
  gold: "unlimited returns; extra fees removed; subscription extension always; disputed bills refunded; credit given for mistimed billing; new promo code; shipping credit",
  silver: "returns within 6 months or with receipt/original packaging; extra fees removed; extension only if 1 day late; bill refund if wrong amount < $10; new promo code; shipping credit",
  bronze: "returns within 90 days or with receipt/original packaging; fees stay; no extension; bill dispute depends on check_system; new promo code; shipping credit",
  guest: "returns within 30 days or with receipt; fees stay; no extension; bill dispute depends on check_system; no new promo code",
};
/** membership: record the member level and return its privileges (policies/membership). */
export function membership(q: { email?: string; level?: string }) {
  const c = q.email ? customers[norm(q.email)!] : undefined;
  const level = norm(q.level) ?? c?.membership ?? c?.plan?.toLowerCase() ?? "guest";
  log("membership", "-", level);
  return { level, onFile: c?.membership, privileges: PRIVILEGES[level] ?? PRIVILEGES.guest };
}

export function subscriptionStatus(email: string) {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  log("subscription_status", "-", c.email);
  return { ok: true, ...c.subscription };
}

/** record-reason / enter-details: note a fact on the case (reason, days waited, refund target, address, username, amount, ...). */
export function recordReason(q: { email?: string; orderId?: string; reason: string }) {
  log("record_reason", q.orderId ?? "-", `${norm(q.email) ?? ""}: ${q.reason}`);
  return { ok: true, recorded: q.reason };
}
export function enterDetails(q: { email?: string; orderId?: string; details: string }) {
  log("enter_details", q.orderId ?? "-", `${norm(q.email) ?? ""}: ${q.details}`);
  return { ok: true, entered: q.details };
}

/** offer-refund: to the card on file (order refund), account credit ("add value"), gift card or paper check. */
export function offerRefund(q: { email?: string; orderId?: string; amount: number; method?: string; reason?: string }) {
  const method = norm(q.method) ?? "credit card";
  if (q.orderId && method === "credit card") return issueRefund(q.orderId, q.amount, q.reason ?? "refund");
  const c = q.email ? customers[norm(q.email)!] : q.orderId ? customers[orders[normId(q.orderId)!]?.email ?? ""] : undefined;
  if (!c) return { ok: false, error: "account not found" };
  if (method === "add value") c.credit = (c.credit ?? 0) + q.amount;
  refundsCredit.push({ email: c.email, amount: q.amount, method });
  const id = `RF-${log("offer_refund", q.orderId ?? "-", `$${q.amount} ${method} ${c.email}`)}`;
  if (q.orderId) refunds.push({ id, orderId: normId(q.orderId)!, amount: q.amount, reason: q.reason ?? "refund", status: method === "add value" ? "sent" : "processing", createdAt: TODAY, method });
  return { ok: true, refundId: id, amount: q.amount, method, ...(method === "gift card" || method === "paper check" ? { mailedTo: c.defaultAddress } : {}), ...(method === "add value" ? { accountCredit: c.credit } : {}) };
}

/** make-purchase: order one product (by SKU or name like "Mercer jeans") for the customer, e.g. a replacement. */
export function makePurchase(email: string, product: string, freeShipping = false) {
  const p = products.find((x) => x.sku === product.trim().toUpperCase() || x.name.toLowerCase() === norm(product));
  if (!p) return { ok: false, error: `unknown product; catalog: ${products.map((x) => x.name).join(", ")}` };
  const r = placeOrder(email, [{ sku: p.sku }]) as any;
  if (freeShipping && r?.order) r.order.total = p.price;
  return r;
}

/** shipping-status: current shipping state of an order with the latest carrier scan. */
export function shippingStatus(orderId: string) {
  const o = orders[normId(orderId)!];
  if (!o) return { ok: false, error: "order not found" };
  log("shipping_status", o.id, o.shippingStatus ?? o.status);
  return { ok: true, orderId: o.id, status: o.status, shippingStatus: o.shippingStatus ?? o.status, placedAt: o.placedAt, shippedAt: o.shippedAt, deliveredAt: o.deliveredAt, tracking: o.tracking, scan: o.tracking ? getTracking(o.tracking) : null };
}

/** update-order: change address/date/item/method/order, cancel shipment, waive fee, give credit, or set return method. */
export function updateOrder(orderId: string, change: string, value?: string, amount?: number) {
  const o = orders[normId(orderId)!];
  if (!o) return { ok: false, error: "order not found" };
  const ch = norm(change)!;
  const notShipped = o.status === "processing";
  if (ch === "change address") return value ? changeShippingAddress(o.id, value) : { ok: false, error: "new address required" };
  if (ch === "cancel shipment" || ch === "cancel order") return cancelOrder(o.id, value ?? "customer request");
  if (["change item", "change method", "change order", "change price"].includes(ch) && !notShipped) return { ok: false, error: `order is ${o.shippingStatus ?? o.status}; ${ch} is only possible before it ships` };
  if (ch === "change method" && value) o.payment.method = value;
  if (ch === "give credit" || ch === "waive fee") { const c = customers[o.email]; if (c) c.credit = (c.credit ?? 0) + (amount ?? 0); }
  if (["by mail", "in store", "drop off center"].includes(ch)) {
    log("update_order", o.id, `return ${ch}`);
    return { ok: true, orderId: o.id, returnMethod: ch, ...(ch === "by mail" ? { label: `prepaid return label emailed to ${o.email}` } : {}) };
  }
  log("update_order", o.id, `${ch}${value ? `: ${value}` : ""}${amount ? ` $${amount}` : ""}`);
  return { ok: true, orderId: o.id, change: ch, value, amount };
}

/** update-account subscription/services: add or remove a service, extend or renew the subscription, pay the bill, change payment method. */
export function updateSubscription(email: string, change: string, value?: string, amount?: number) {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  const ch = norm(change)!, sub = c.subscription;
  if (ch === "add service" && value) c.services = [...(c.services ?? []), value];
  else if (ch === "remove service" && value) c.services = (c.services ?? []).filter((s) => s !== value);
  else if ((ch === "extend subscription" || ch === "renew subscription") && sub) { sub.status = "active"; sub.dueDate = new Date(Date.parse(sub.dueDate) + 86400000 * (ch === "renew subscription" ? 365 : 7)).toISOString().slice(0, 10); }
  else if (ch === "pay bill" && sub) sub.dueAmount = Math.max(0, sub.dueAmount - (amount ?? sub.dueAmount));
  else if (ch === "change payment method" && value) c.paymentMethods = [value, ...c.paymentMethods.filter((m) => m !== value)];
  else return { ok: false, error: "change must be add service | remove service | extend subscription | renew subscription | pay bill | change payment method" };
  log("update_account", "-", `${c.email}: ${ch}${value ? ` ${value}` : ""}${amount ? ` $${amount}` : ""}`);
  return { ok: true, subscription: c.subscription, services: c.services, paymentMethods: c.paymentMethods };
}

/** make-password: generate a temporary password for the account (after identity details are entered). */
export function makePassword(q: { email?: string; username?: string }) {
  const c = who(q);
  if (!c) return { ok: false, error: "account not found" };
  log("make_password", "-", c.email);
  return { ok: true, temporaryPassword: `nw-${(hash(c.email) % 1e6).toString().padStart(6, "0")}`, username: c.username, note: "customer must change it at next login" };
}

/** promo-code: issue a new 7-day promo code (price match, invalid/expired code, out of stock). */
export function promoCode(email: string, reason: string, percent = 10) {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  const code = `NW${percent}-${(hash(c.email + reason) % 1e5).toString(36).toUpperCase()}`;
  log("promo_code", "-", `${c.email}: ${code} (${reason})`);
  return { ok: true, code, percent, expires: new Date(Date.parse(TODAY) + 7 * 86400000).toISOString().slice(0, 10) };
}

/** send-link: email the customer a link (reset 2FA, subscription/billing page, return label, FAQ). */
export function sendLink(email: string, kind: string) {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  log("send_link", "-", `${c.email}: ${kind}`);
  return { ok: true, sentTo: c.email, kind };
}

/** notify-team: hand off to manager, website team or purchasing department. */
export function notifyTeam(team: string, email: string, summary: string) {
  return createCase(email, norm(team)!, summary);
}

/** try-again / log-out-in / instructions: record a site troubleshooting step the customer was asked to do. */
export function troubleshootStep(email: string, step: string) {
  log("troubleshoot", "-", `${norm(email)}: ${step}`);
  return { ok: true, step };
}
