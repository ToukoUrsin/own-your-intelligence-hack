// Shopify backend for the shop tools (SHOP_BACKEND=shopify). Talks to the Admin GraphQL API of the dev store
// kettle-and-co-support-hack.myshopify.com, seeded by data/seed_shopify.ts.
// Reads are served synchronously from a cache loaded once by init() (other code calls the shop tools synchronously);
// writes are async Shopify mutations that refresh the cached order/customer afterwards.
import type { Customer, Order, Refund } from "./shop";
import fixtures from "../../data/shop.json";

export const STORE = process.env.SHOPIFY_STORE ?? "kettle-and-co-support-hack.myshopify.com";
export const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2026-07";
export const TAG = "kc"; // every seeded or agent-created customer/order carries this tag

export async function gql<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!token) throw new Error("SHOPIFY_ADMIN_TOKEN is not set");
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const body: any = await res.json().catch(() => ({}));
    const throttled = res.status === 429 || body.errors?.some?.((e: any) => e.extensions?.code === "THROTTLED");
    if (throttled && attempt < 5) { await Bun.sleep(1000 * (attempt + 1)); continue; }
    if (!res.ok || body.errors) throw new Error(`Shopify ${res.status}: ${JSON.stringify(body.errors ?? body).slice(0, 500)}`);
    return body.data as T;
  }
}

// Mutations return userErrors; turn them into exceptions.
export function check<T extends Record<string, any>>(payload: T, what: string): T {
  const errs = payload?.userErrors ?? payload?.orderCancelUserErrors ?? [];
  if (errs.length) throw new Error(`${what}: ${errs.map((e: any) => e.message).join("; ")}`);
  return payload;
}

// "88 Alder St, Portland, OR 97205, US" <-> MailingAddressInput
export function parseAddress(s: string) {
  const parts = s.split(",").map((p) => p.trim());
  const countryCode = parts.pop()!;
  const address1 = parts.shift()!;
  let city = "", provinceCode: string | undefined, zip = "";
  if (parts.length >= 2) { city = parts[0]!; const [prov, ...z] = parts[1]!.split(" "); provinceCode = prov; zip = z.join(" "); }
  else if (parts.length === 1) {
    const [first, ...rest] = parts[0]!.split(" ");
    if (/\d/.test(first!)) { zip = first!; city = rest.join(" "); } else { city = first!; zip = rest.join(" "); } // "75011 Paris" vs "London W1J 5LF"
  }
  return { address1, city, ...(provinceCode ? { provinceCode } : {}), zip, countryCode };
}
export function formatAddress(a?: any): string {
  if (!a) return "";
  const cc = a.countryCodeV2 ?? a.countryCode;
  const local = a.provinceCode && (cc === "US" || cc === "CA") ? [a.city, `${a.provinceCode} ${a.zip}`] : /^\d/.test(a.zip ?? "") ? [`${a.zip} ${a.city}`] : [`${a.city} ${a.zip}`];
  return [a.address1, ...local, cc].filter(Boolean).join(", ");
}
export function splitName(name: string) {
  if (name.includes("(")) return { firstName: name, lastName: "" }; // business accounts keep the full name
  const i = name.lastIndexOf(" ");
  return i < 0 ? { firstName: name, lastName: "" } : { firstName: name.slice(0, i), lastName: name.slice(i + 1) };
}

// Records a refund against the order's sale (seeded and agent-placed sales use the manual gateway with an
// authorization code, which Shopify accepts as a parent; refundCreate requires @idempotent since 2026-07).
// Fallback for older orders: record it on the cash gateway.
export async function recordRefund(orderGid: string, amount: number, note: string, key: string) {
  const q = `mutation($input: RefundInput!, $key: String!) { refundCreate(input: $input) @idempotent(key: $key) { refund { id } userErrors { field message } } }`;
  const d = await gql<any>(`query($id: ID!) { order(id: $id) { transactions(first: 20) { id kind status gateway } } }`, { id: orderGid });
  const sale = d.order.transactions.find((t: any) => (t.kind === "SALE" || t.kind === "CAPTURE") && t.status === "SUCCESS");
  const tx = (extra: object) => ({ input: { orderId: orderGid, note, notify: false, transactions: [{ orderId: orderGid, kind: "REFUND", amount: amount.toFixed(2), ...extra }] } });
  if (sale) {
    const r = await gql(q, { key: `${key}-sale`, ...tx({ parentId: sale.id, gateway: sale.gateway }) });
    if (!r.refundCreate.userErrors.length) return r.refundCreate.refund.id as string;
  }
  const r = await gql(q, { key: `${key}-cash`, ...tx({ gateway: "cash" }) });
  return check(r.refundCreate, "refundCreate").refund.id as string;
}

// ---------- cache ----------
export const customers: Record<string, Customer & { shopifyId?: string }> = {};
export const orders: Record<string, Order & { shopifyId?: string; statusPageUrl?: string }> = {};
const refundsByOrder: Record<string, Refund[]> = {};
// Refunds still waiting for a return have no Shopify refund object yet; they come from the fixtures.
const pendingRefunds = (fixtures.refunds as Refund[]).filter((r) => r.status !== "sent");

let log: (type: string, orderId: string, detail: string) => number = () => 0;

const CUSTOMER_FIELDS = `id email firstName lastName phone note tags createdAt
  defaultAddress { address1 city provinceCode zip countryCodeV2 }
  emailMarketingConsent { marketingState }`;
const ORDER_FIELDS = `id name email tags note processedAt cancelledAt statusPageUrl displayFinancialStatus displayFulfillmentStatus
  customAttributes { key value }
  totalPriceSet { shopMoney { amount } }
  shippingAddress { address1 city provinceCode zip countryCodeV2 }
  lineItems(first: 50) { nodes { sku title quantity originalUnitPriceSet { shopMoney { amount } } customAttributes { key value } } }
  fulfillments(first: 5) { createdAt deliveredAt displayStatus trackingInfo { number company } }
  refunds(first: 20) { id createdAt note totalRefundedSet { shopMoney { amount } } }
  transactions(first: 20) { id kind status gateway amountSet { shopMoney { amount } } }`;

const day = (iso?: string | null) => iso?.slice(0, 10);
const attr = (list: { key: string; value: string }[] | undefined, key: string) => list?.find((a) => a.key === key)?.value;

function toCustomer(c: any): Customer & { shopifyId: string } {
  const tags: string[] = c.tags ?? [];
  const tag = (p: string) => tags.find((t) => t.startsWith(p))?.slice(p.length);
  const pm = /Payment methods: (.*)/.exec(c.note ?? "")?.[1];
  return {
    email: c.email?.toLowerCase(), name: [c.firstName, c.lastName].filter(Boolean).join(" "),
    plan: (tag("plan:") ?? "Standard") as Customer["plan"], since: tag("since:") ?? day(c.createdAt)!,
    defaultAddress: formatAddress(c.defaultAddress), paymentMethods: pm ? pm.split("; ") : [],
    newsletter: c.emailMarketingConsent?.marketingState === "SUBSCRIBED",
    status: tags.includes("pending_deletion") ? "pending_deletion" : tags.includes("unverified") ? "unverified" : "active",
    ...(c.phone ? { phone: c.phone } : {}), shopifyId: c.id,
  };
}

const FIN: Record<string, string> = { PAID: "paid", REFUNDED: "refunded", PARTIALLY_REFUNDED: "partially_refunded", PENDING: "pending", AUTHORIZED: "authorized", VOIDED: "voided", PARTIALLY_PAID: "partially_paid" };

function toOrder(o: any) {
  const id = attr(o.customAttributes, "kc_id") ?? o.name.replace(/^#/, "");
  const f = o.fulfillments?.[0];
  const status: Order["status"] = o.cancelledAt ? "cancelled" : !f ? "processing" : f.displayStatus === "DELIVERED" || f.deliveredAt ? "delivered" : "shipped";
  let payStatus = FIN[o.displayFinancialStatus] ?? String(o.displayFinancialStatus).toLowerCase();
  const override = attr(o.customAttributes, "payment_status"); // failed / due (net-30) / refund_pending: not Shopify financial states
  if (override && (payStatus === "pending" || (override === "refund_pending" && payStatus === "paid"))) payStatus = override;
  const items = o.lineItems.nodes.flatMap((li: any) => Array.from({ length: li.quantity }, () => {
    const serial = attr(li.customAttributes, "serial");
    return { sku: li.sku, name: li.title, price: Number(li.originalUnitPriceSet.shopMoney.amount), ...(serial ? { serial } : {}) };
  }));
  const order: Order & { shopifyId: string; statusPageUrl: string } = {
    id, email: o.email?.toLowerCase(), items, total: Number(o.totalPriceSet.shopMoney.amount), status,
    placedAt: day(o.processedAt)!, shipTo: formatAddress(o.shippingAddress),
    payment: { method: attr(o.customAttributes, "payment_method") ?? "card", status: payStatus },
    invoiceId: attr(o.customAttributes, "invoice_id") ?? `INV-${id.replace(/\D/g, "")}`,
    ...(f?.trackingInfo?.[0] ? { tracking: f.trackingInfo[0].number } : {}),
    ...(f ? { shippedAt: attr(o.customAttributes, "shipped_at") ?? day(f.createdAt) } : {}),
    ...(status === "delivered" ? { deliveredAt: attr(o.customAttributes, "delivered_at") ?? day(f.deliveredAt) } : {}),
    shopifyId: o.id, statusPageUrl: o.statusPageUrl,
  };
  refundsByOrder[id] = o.refunds.map((r: any) => ({
    id: r.id.split("/").pop(), orderId: id, amount: Number(r.totalRefundedSet.shopMoney.amount), reason: r.note ?? "",
    status: "sent", createdAt: day(r.createdAt)!, sentAt: day(r.createdAt), method: order.payment.method,
  }));
  (order as any)._transactions = o.transactions;
  return order;
}
const txns = (o: Order): any[] => (o as any)._transactions ?? [];
const cacheOrder = (raw: any) => { const o = toOrder(raw); orders[o.id] = o; return o; };
const cacheCustomer = (raw: any) => { const c = toCustomer(raw); customers[c.email] = c; return c; };

async function paginate(kind: "orders" | "customers", fields: string, onNode: (n: any) => void) {
  let after: string | null = null;
  do {
    const d: any = await gql(`query($after: String) { ${kind}(first: 50, after: $after, query: "tag:${TAG}") { nodes { ${fields} } pageInfo { hasNextPage endCursor } } }`, { after });
    d[kind].nodes.forEach(onNode);
    after = d[kind].pageInfo.hasNextPage ? d[kind].pageInfo.endCursor : null;
  } while (after);
}

export async function init(logger?: typeof log) {
  if (logger) log = logger;
  await Promise.all([paginate("customers", CUSTOMER_FIELDS, cacheCustomer), paginate("orders", ORDER_FIELDS, cacheOrder)]);
}

async function refreshOrder(gid: string) {
  const d = await gql(`query($id: ID!) { order(id: $id) { ${ORDER_FIELDS} } }`, { id: gid });
  return cacheOrder(d.order);
}
async function refreshCustomer(gid: string) {
  const d = await gql(`query($id: ID!) { customer(id: $id) { ${CUSTOMER_FIELDS} } }`, { id: gid });
  return cacheCustomer(d.customer);
}

const norm = (s?: string) => s?.trim().toLowerCase();
const normId = (s?: string) => s?.trim().toUpperCase().replace(/^#/, "");
const strip = <T extends object>(o: T) => { const { _transactions, ...rest } = o as any; return rest as T; };
const fail = (e: unknown) => ({ ok: false, error: String((e as Error)?.message ?? e) });

// ---------- reads (sync, from cache) ----------
export function findCustomer(query: { email?: string; name?: string }) {
  if (query.email) return customers[norm(query.email)!] ?? null;
  if (query.name) return Object.values(customers).filter((c) => c.name.toLowerCase().includes(norm(query.name)!));
  return null;
}

export function findOrders(query: { orderId?: string; email?: string }): Order[] {
  if (query.orderId) { const o = orders[normId(query.orderId)!]; return o ? [strip(o)] : []; }
  if (query.email) return Object.values(orders).filter((o) => o.email === norm(query.email)).map(strip);
  return [];
}

export function getRefunds(query: { orderId?: string; email?: string }) {
  const ids = query.orderId ? [normId(query.orderId)!] : findOrders({ email: query.email }).map((o) => o.id);
  return [...ids.flatMap((id) => refundsByOrder[id] ?? []), ...pendingRefunds.filter((r) => ids.includes(r.orderId))];
}

// Invoice PDF link = the Shopify order status page (the customer's receipt).
export function getInvoices(query: { invoiceId?: string; orderId?: string; email?: string }) {
  const list = query.invoiceId ? Object.values(orders).filter((o) => o.invoiceId === normId(query.invoiceId)) : findOrders(query).map((o) => orders[o.id]!);
  return list.map((o) => ({ invoiceId: o.invoiceId, orderId: o.id, date: o.placedAt, amount: o.total, status: o.payment.status, pdf: o.statusPageUrl }));
}

// ---------- writes (async Shopify mutations) ----------
export async function placeOrder(email: string, items: { sku: string; qty?: number }[]) {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  const lines = items.flatMap(({ sku, qty = 1 }) => { const p = fixtures.products.find((x) => x.sku === sku); return p ? [{ ...p, qty }] : []; });
  if (!lines.length) return { ok: false, error: "no valid SKUs" };
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipping = c.plan !== "Standard" || subtotal > 60 ? 0 : 6;
  const id = `KC-${12000 + Object.keys(orders).length}`;
  const money = (n: number) => ({ shopMoney: { amount: n.toFixed(2), currencyCode: "USD" } });
  const paid = c.paymentMethods.length > 0;
  try {
    const d = await gql(`mutation($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) { orderCreate(order: $order, options: $options) { order { ${ORDER_FIELDS} } userErrors { field message } } }`, {
      options: { sendReceipt: false, sendFulfillmentReceipt: false },
      order: {
        name: id, email: c.email, tags: [TAG, id], currency: "USD",
        customer: { toAssociate: { id: c.shopifyId } },
        shippingAddress: { ...parseAddress(c.defaultAddress), ...splitName(c.name) },
        lineItems: lines.map((l) => ({ title: l.name, sku: l.sku, quantity: l.qty, priceSet: money(l.price), requiresShipping: true })),
        ...(shipping ? { shippingLines: [{ title: "Standard shipping", priceSet: money(shipping) }] } : {}),
        customAttributes: [{ key: "kc_id", value: id }, { key: "invoice_id", value: `INV-${id.slice(3)}` }, { key: "payment_method", value: c.paymentMethods[0] ?? "none" }, ...(paid ? [] : [{ key: "payment_status", value: "failed" }])],
        ...(paid ? { transactions: [{ kind: "SALE", status: "SUCCESS", gateway: "manual", authorizationCode: `agent-${id}`, test: true, amountSet: money(subtotal + shipping) }] } : { financialStatus: "PENDING" }),
      },
    });
    const o = cacheOrder(check(d.orderCreate, "orderCreate").order);
    log("place_order", id, `${lines.map((l) => l.sku).join(",")} $${subtotal + shipping} (Shopify ${o.shopifyId})`);
    return { ok: true, order: strip(o) };
  } catch (e) { return fail(e); }
}

export async function cancelOrder(orderId: string, reason: string) {
  const o = orders[normId(orderId)!];
  if (!o) return { ok: false, error: "order not found" };
  if (o.status !== "processing") return { ok: false, error: `order is ${o.status}; only processing orders can be cancelled` };
  const refundable = txns(o).some((t) => t.kind === "SALE" && t.status === "SUCCESS");
  try {
    if (refundable) await recordRefund(o.shopifyId!, o.total, `Cancelled: ${reason}`.slice(0, 255), `cancel-${o.id}-${Date.now()}`);
    const d = await gql(`mutation($id: ID!, $note: String) { orderCancel(orderId: $id, refundMethod: { originalPaymentMethodsRefund: false }, restock: true, reason: CUSTOMER, notifyCustomer: false, staffNote: $note) { job { id } orderCancelUserErrors { field message } } }`,
      { id: o.shopifyId, note: reason.slice(0, 255) });
    check(d.orderCancel, "orderCancel");
    // Cancellation runs as a background job; wait for it.
    let fresh = await refreshOrder(o.shopifyId!);
    for (let i = 0; i < 12 && fresh.status !== "cancelled"; i++) { await Bun.sleep(1000); fresh = await refreshOrder(o.shopifyId!); }
    log("cancel_order", o.id, `${reason} (Shopify ${o.shopifyId})`);
    const refund = refundsByOrder[o.id]?.at(-1) ?? null;
    return { ok: fresh.status === "cancelled", status: fresh.status, paymentStatus: fresh.payment.status, refund };
  } catch (e) { return fail(e); }
}

export async function changeShippingAddress(orderId: string, address: string) {
  const o = orders[normId(orderId)!];
  if (!o) return { ok: false, error: "order not found" };
  if (o.status !== "processing") return { ok: false, error: `order is ${o.status}; label already created, address cannot be changed`, tracking: o.tracking };
  const name = splitName(customers[o.email]?.name ?? "");
  try {
    const d = await gql(`mutation($input: OrderInput!) { orderUpdate(input: $input) { order { id } userErrors { field message } } }`,
      { input: { id: o.shopifyId, shippingAddress: { ...parseAddress(address), ...name } } });
    check(d.orderUpdate, "orderUpdate");
    const fresh = await refreshOrder(o.shopifyId!);
    log("change_shipping_address", o.id, `${fresh.shipTo} (Shopify ${o.shopifyId})`);
    return { ok: true, order: strip(fresh) };
  } catch (e) { return fail(e); }
}

export async function issueRefund(orderId: string, amount: number, reason: string) {
  const o = orders[normId(orderId)!];
  if (!o) return { ok: false, error: "order not found" };
  const refunded = (refundsByOrder[o.id] ?? []).reduce((s, r) => s + r.amount, 0);
  if (amount + refunded > o.total) return { ok: false, error: `refund exceeds order total ($${o.total - refunded} left)` };
  if (!txns(o).some((t) => (t.kind === "SALE" || t.kind === "CAPTURE") && t.status === "SUCCESS")) return { ok: false, error: `order has no captured payment (payment ${o.payment.status}); nothing to refund` };
  try {
    const r = { id: await recordRefund(o.shopifyId!, amount, reason, `refund-${o.id}-${Date.now()}`) };
    await refreshOrder(o.shopifyId!);
    const refundId = r.id.split("/").pop();
    log("refund", o.id, `$${amount}: ${reason} (Shopify refund ${refundId})`);
    return { ok: true, refundId, amount, method: o.payment.method };
  } catch (e) { return fail(e); }
}

export async function updateAccount(email: string, changes: { name?: string; phone?: string; defaultAddress?: string; newEmail?: string }) {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  const { newEmail, name, phone, defaultAddress } = changes;
  try {
    if (name || phone) {
      const d = await gql(`mutation($input: CustomerInput!) { customerUpdate(input: $input) { customer { id } userErrors { field message } } }`,
        { input: { id: c.shopifyId, ...(name ? splitName(name) : {}), ...(phone ? { phone } : {}) } });
      check(d.customerUpdate, "customerUpdate");
    }
    if (defaultAddress) {
      const d = await gql(`mutation($id: ID!, $address: MailingAddressInput!) { customerAddressCreate(customerId: $id, address: $address, setAsDefault: true) { address { id } userErrors { field message } } }`,
        { id: c.shopifyId, address: { ...parseAddress(defaultAddress), ...splitName(name ?? c.name) } });
      check(d.customerAddressCreate, "customerAddressCreate");
    }
    const fresh = await refreshCustomer(c.shopifyId!);
    log("update_account", "-", `${c.email}: ${JSON.stringify(changes)} (Shopify ${c.shopifyId})`);
    // Email changes need the customer to confirm the new address, so Shopify's email is left as is.
    return { ok: true, customer: fresh, ...(newEmail ? { emailChange: `confirmation link sent to ${newEmail}` } : {}) };
  } catch (e) { return fail(e); }
}

async function retag(c: Customer & { shopifyId?: string }, add: string[], remove: string[]) {
  if (remove.length) check((await gql(`mutation($id: ID!, $tags: [String!]!) { tagsRemove(id: $id, tags: $tags) { userErrors { field message } } }`, { id: c.shopifyId, tags: remove })).tagsRemove, "tagsRemove");
  if (add.length) check((await gql(`mutation($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { userErrors { field message } } }`, { id: c.shopifyId, tags: add })).tagsAdd, "tagsAdd");
  return refreshCustomer(c.shopifyId!);
}

// Plans are customer tags (plan:Standard/Plus/Business); downgrades take effect at the next billing date.
export async function changePlan(email: string, plan: "Standard" | "Plus") {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  if (c.plan === plan) return { ok: false, error: `already on ${plan}` };
  if (c.plan === "Business") return { ok: false, error: "Business accounts are changed by sales; create a sales case" };
  const from = c.plan, effective = plan === "Plus" ? "2026-09-27" : "2026-10-14";
  try {
    if (plan === "Plus") await retag(c, ["plan:Plus"], [`plan:${from}`]);
    else await retag(c, [`plan_change:${plan}@${effective}`], []);
    log("change_plan", "-", `${c.email}: ${from} → ${plan} from ${effective} (Shopify ${c.shopifyId})`);
    return { ok: true, from, to: plan, effective };
  } catch (e) { return fail(e); }
}

export async function createAccount(email: string, name: string) {
  if (customers[norm(email)!]) return { ok: false, error: "an account already exists for this email" };
  try {
    const d = await gql(`mutation($input: CustomerInput!) { customerCreate(input: $input) { customer { ${CUSTOMER_FIELDS} } userErrors { field message } } }`,
      { input: { email: norm(email), ...splitName(name), tags: [TAG, "plan:Standard", "since:2026-09-27", "unverified"] } });
    const c = cacheCustomer(check(d.customerCreate, "customerCreate").customer);
    log("create_account", "-", `${c.email} (Shopify ${c.shopifyId})`);
    return { ok: true, verificationSentTo: c.email };
  } catch (e) { return fail(e); }
}

export async function requestAccountDeletion(email: string) {
  const c = customers[norm(email)!];
  if (!c) return { ok: false, error: "no account for this email" };
  const open = Object.values(orders).filter((o) => o.email === c.email && (o.status === "processing" || o.status === "shipped")).map((o) => o.id);
  try {
    await retag(c, ["pending_deletion"], []);
    log("request_account_deletion", "-", `${c.email} (Shopify ${c.shopifyId})`);
    return { ok: true, confirmationSentTo: c.email, deletedDaysAfterConfirmation: 14, openOrders: open };
  } catch (e) { return fail(e); }
}
