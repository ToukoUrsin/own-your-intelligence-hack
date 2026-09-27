// Seeds the Shopify dev store with the fixtures in data/shop.json (customers, orders, fulfillments, refunds).
// Idempotent: records ourId -> Shopify GID in data/shopify-map.json and looks things up (map, then tag/email search) before creating.
// Run: /Users/touko/.local/bin/hsec exec --only SHOPIFY_ADMIN_TOKEN -- bun data/seed_shopify.ts
// Products: the app token only has read_products, so orders use custom line items carrying our SKU, title and price.
import { check, gql, parseAddress, recordRefund, splitName, TAG } from "../agent/src/shopify";
import fixtures from "./shop.json";

const MAP_PATH = new URL("./shopify-map.json", import.meta.url).pathname;
const map: { store: string; products: Record<string, string | null>; customers: Record<string, string>; orders: Record<string, string>; refunds: Record<string, string> } =
  await Bun.file(MAP_PATH).json().catch(() => ({ store: "", products: {}, customers: {}, orders: {}, refunds: {} }));
map.store = "kettle-and-co-support-hack.myshopify.com";
const save = () => Bun.write(MAP_PATH, JSON.stringify(map, null, 2) + "\n");

const BRAND: string = (fixtures as any).brand ?? (fixtures as any).shop?.name ?? "Northwind Outfitters";
const money = (n: number) => ({ shopMoney: { amount: n.toFixed(2), currencyCode: "USD" } });
const exists = async (gid?: string) => !!gid && !!(await gql(`query($id: ID!) { node(id: $id) { id } }`, { id: gid })).node;

// Catalog: needs write_products (the current app token has read_products only, so this is skipped until the scope is added).
// Creates/updates the brand's products by handle and archives Shopify's generated sample products.
const scopes: string[] = (await gql(`{ currentAppInstallation { accessScopes { handle } } }`)).currentAppInstallation.accessScopes.map((s: any) => s.handle);
if (scopes.includes("write_products")) await seedCatalog();
else console.log("skip catalog: app token lacks write_products");

async function seedCatalog() {
  // Generic over data/shop.json products: {sku, name, price, category?|type?, description?, image?|images?, variants?: [{name, sku, price}]}.
  const brand = BRAND;
  const brandTag = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const slug = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for (const p of fixtures.products as any[]) {
    const type = p.category ?? p.type ?? "Apparel", handle = p.handle ?? slug(p.name);
    const opt = p.variants?.length ? (p.optionName ?? "Size") : "Title";
    const vals: [string, string, number][] = p.variants?.length ? p.variants.map((v: any) => [v.name ?? v.size, v.sku, v.price ?? p.price]) : [["Default Title", p.sku, p.price]];
    const images: string[] = p.images ?? (p.image ? [p.image] : []);
    const d = await gql(`mutation($input: ProductSetInput!, $identifier: ProductSetIdentifiers) { productSet(input: $input, identifier: $identifier, synchronous: true) { product { id } userErrors { field message } } }`, {
      identifier: { handle },
      input: {
        title: p.name, handle, vendor: brand, productType: type, status: "ACTIVE", tags: [brandTag, slug(type)],
        descriptionHtml: `<p>${p.description ?? `${p.name} from ${brand}.`}</p>`,
        productOptions: [{ name: opt, values: vals.map(([n]) => ({ name: n })) }],
        variants: vals.map(([n, sku, price]) => ({ optionValues: [{ optionName: opt, name: n }], sku, price: Number(price).toFixed(2) })),
        ...(images.length ? { files: images.map((u) => ({ originalSource: u, contentType: "IMAGE", alt: p.name })) } : {}),
      },
    });
    console.log(`= product ${handle} ${check(d.productSet, `productSet ${handle}`).product.id}`);
  }
  // Archive Shopify's generated sample products (snowboards, gift card) so the admin shows only our brand.
  const others = await gql(`{ products(first: 100, query: "-tag:${brandTag} -status:archived") { nodes { id title } } }`);
  for (const p of others.products.nodes) {
    const d = await gql(`mutation($p: ProductUpdateInput!) { productUpdate(product: $p) { product { id } userErrors { field message } } }`, { p: { id: p.id, status: "ARCHIVED" } });
    check(d.productUpdate, `archive ${p.title}`);
    console.log(`- archived sample product ${p.title}`);
  }
}

// Products: link to an existing store product with the same SKU if there is one (none are created: read_products only).
for (const p of fixtures.products) {
  const d = await gql(`query($q: String!) { productVariants(first: 1, query: $q) { nodes { id } } }`, { q: `sku:${p.sku}` });
  map.products[p.sku] = d.productVariants.nodes[0]?.id ?? null;
}

// Background customers and orders (deterministic, never referenced by tickets).
const extra = background();
const allCustomers = [...fixtures.customers, ...extra.customers];

// Customers
for (const c of allCustomers) {
  if (await exists(map.customers[c.email])) continue;
  const found = await gql(`query($q: String!) { customers(first: 1, query: $q) { nodes { id } } }`, { q: `email:${c.email}` });
  let id: string | undefined = found.customers.nodes[0]?.id;
  if (id) { // reused (e.g. retired by an earlier dataset): make sure the backend's tag is on it
    await gql(`mutation($id: ID!) { tagsAdd(id: $id, tags: ["${TAG}"]) { userErrors { message } } }`, { id });
    await gql(`mutation($id: ID!) { tagsRemove(id: $id, tags: ["legacy-coffee"]) { userErrors { message } } }`, { id });
  }
  if (!id) {
    const d = await gql(`mutation($input: CustomerInput!) { customerCreate(input: $input) { customer { id } userErrors { field message } } }`, {
      input: {
        email: c.email, ...splitName(c.name), tags: [TAG, `plan:${c.plan}`, `since:${c.since}`, ...(c.status !== "active" ? [c.status] : [])],
        note: `${BRAND} customer since ${c.since}. Payment methods: ${c.paymentMethods.join("; ")}`,
        ...(c.newsletter ? { emailMarketingConsent: { marketingState: "SUBSCRIBED", marketingOptInLevel: "SINGLE_OPT_IN" } } : {}),
      },
    });
    id = check(d.customerCreate, `customerCreate ${c.email}`).customer.id as string;
    const a = await gql(`mutation($id: ID!, $address: MailingAddressInput!) { customerAddressCreate(customerId: $id, address: $address, setAsDefault: true) { address { id } userErrors { field message } } }`,
      { id, address: { ...parseAddress(c.defaultAddress), ...splitName(c.name) } });
    check(a.customerAddressCreate, `customerAddressCreate ${c.email}`);
    console.log(`+ customer ${c.email} ${id}`);
  }
  map.customers[c.email] = id;
  await save();
}

// Fulfilment with tracking (orderCreate's own fulfillment input needs a location id, which needs read_locations).
async function fulfil(id: string, o: any) {
  const d = await gql(`query($id: ID!) { order(id: $id) { fulfillments(first: 1) { id displayStatus } fulfillmentOrders(first: 5) { nodes { id status } } } }`, { id });
  let f = d.order.fulfillments[0];
  if (!f) {
    const open = d.order.fulfillmentOrders.nodes.filter((x: any) => x.status === "OPEN" || x.status === "IN_PROGRESS");
    const r = await gql(`mutation($f: FulfillmentInput!) { fulfillmentCreate(fulfillment: $f) { fulfillment { id displayStatus } userErrors { field message } } }`, {
      f: { lineItemsByFulfillmentOrder: open.map((x: any) => ({ fulfillmentOrderId: x.id })), notifyCustomer: false, trackingInfo: { number: o.tracking, company: carrier(o.tracking) } },
    });
    f = check(r.fulfillmentCreate, `fulfillmentCreate ${o.id}`).fulfillment;
    console.log(`  fulfilled ${o.id} ${o.tracking}`);
  }
  const want = o.status === "delivered" ? "DELIVERED" : "IN_TRANSIT";
  if (f.displayStatus !== want) {
    const at = o.status === "delivered" ? o.deliveredAt : o.shippedAt;
    const r = await gql(`mutation($e: FulfillmentEventInput!) { fulfillmentEventCreate(fulfillmentEvent: $e) { fulfillmentEvent { id } userErrors { field message } } }`,
      { e: { fulfillmentId: f.id, status: want, happenedAt: `${at}T15:00:00Z` } });
    check(r.fulfillmentEventCreate, `fulfillmentEventCreate ${o.id}`);
  }
}

// Dev stores rate-limit orderCreate ("Too many attempts"); wait and retry.
async function createOrder(q: string, v: Record<string, unknown>) {
  for (let i = 0; ; i++) {
    const d = await gql(q, v);
    if (i < 40 && d.orderCreate.userErrors.some((e: any) => /too many attempts/i.test(e.message))) { console.log("  (orderCreate rate limit, waiting 15 s)"); await Bun.sleep(15000); continue; }
    return d;
  }
}

// Orders: the fixtures (they match the tickets) plus deterministic background orders from other customers,
// so the store looks like a real shop with ~65 orders over the last 30 days.
const carrier = (t: string) => (t.startsWith("DHL") ? "DHL Express" : "UPS");
for (const o of [...fixtures.orders, ...extra.orders] as any[]) {
  if (await exists(map.orders[o.id])) continue;
  const found = await gql(`query($q: String!) { orders(first: 1, query: $q) { nodes { id } } }`, { q: `tag:${TAG} AND tag:'${o.id}'` });
  let id: string | undefined = found.orders.nodes[0]?.id;
  if (!id) {
    const c = allCustomers.find((x) => x.email === o.email)!;
    const bySku = new Map<string, any[]>();
    for (const it of o.items) bySku.set(it.sku, [...(bySku.get(it.sku) ?? []), it]);
    const subtotal = o.items.reduce((s: number, i: any) => s + i.price, 0);
    const shipping = o.total - subtotal;
    // Orders that were paid (including ones later cancelled/refunded) get a successful test sale on the manual gateway (with an authorization code, so it can be refunded).
    const paid = !["failed", "due"].includes(o.payment.status);
    const attrs: Record<string, string | undefined> = {
      kc_id: o.id, invoice_id: o.invoiceId, payment_method: o.payment.method, shipped_at: o.shippedAt, delivered_at: o.deliveredAt,
      payment_status: ["failed", "due", "refund_pending"].includes(o.payment.status) ? o.payment.status : undefined,
    };
    const d = await createOrder(`mutation($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) { orderCreate(order: $order, options: $options) { order { id } userErrors { field message } } }`, {
      options: { sendReceipt: false, sendFulfillmentReceipt: false, inventoryBehaviour: "BYPASS" },
      order: {
        name: o.id, email: o.email, currency: "USD", tags: [TAG, o.id], note: `${BRAND} order ${o.id}`,
        processedAt: `${o.placedAt}T12:00:00Z`,
        customer: { toAssociate: { id: map.customers[o.email] } },
        shippingAddress: { ...parseAddress(o.shipTo), ...splitName(c.name) },
        billingAddress: { ...parseAddress(o.shipTo), ...splitName(c.name) },
        lineItems: [...bySku.values()].map((its) => ({
          title: its[0].name, sku: its[0].sku, quantity: its.length, priceSet: money(its[0].price), requiresShipping: true,
          ...(map.products[its[0].sku] ? { variantId: map.products[its[0].sku] } : {}),
          ...(its[0].serial ? { properties: [{ name: "serial", value: its[0].serial }] } : {}),
        })),
        ...(shipping > 0 ? { shippingLines: [{ title: o.shipTo.endsWith("US") ? "Standard shipping" : "International shipping", priceSet: money(shipping) }] } : {}),
        customAttributes: Object.entries(attrs).filter(([, v]) => v).map(([key, value]) => ({ key, value })),
        ...(paid
          ? { transactions: [{ kind: "SALE", status: "SUCCESS", gateway: "manual", authorizationCode: `seed-${o.id}`, test: true, amountSet: money(o.total), processedAt: `${o.placedAt}T12:00:00Z` }] }
          : { financialStatus: "PENDING" }),
      },
    });
    id = check(d.orderCreate, `orderCreate ${o.id}`).order.id as string;
    console.log(`+ order ${o.id} ${id}`);
  }
  map.orders[o.id] = id;
  await save();
  if (o.tracking) await fulfil(id, o);

  if (o.status === "cancelled") {
    const s = await gql(`query($id: ID!) { order(id: $id) { cancelledAt } }`, { id });
    if (!s.order.cancelledAt) {
      const r = fixtures.refunds.find((x) => x.orderId === o.id);
      const s2 = await gql(`query($id: ID!) { order(id: $id) { refunds(first: 1) { id } } }`, { id });
      if (!s2.order.refunds.length) await recordRefund(id, o.total, r?.reason ?? "Cancelled", `seed-cancel-${o.id}`);
      const d = await gql(`mutation($id: ID!, $note: String) { orderCancel(orderId: $id, refundMethod: { originalPaymentMethodsRefund: false }, restock: true, reason: CUSTOMER, notifyCustomer: false, staffNote: $note) { job { id } orderCancelUserErrors { field message } } }`,
        { id, note: r?.reason ?? "Cancelled" });
      check(d.orderCancel, `orderCancel ${o.id}`);
      console.log(`  cancelled ${o.id}`);
    }
  }
}

// Completed refunds on orders that are not cancelled (e.g. RF-0877 partial refund). Pending refunds stay in the fixtures.
for (const r of [...fixtures.refunds, ...extra.refunds].filter((x) => x.status === "sent")) {
  const o = ([...fixtures.orders, ...extra.orders] as any[]).find((x) => x.id === r.orderId);
  if (!o || o.status === "cancelled" || map.refunds[r.id]) continue;
  const d = await gql(`query($id: ID!) { order(id: $id) { refunds(first: 5) { id } transactions(first: 5) { id kind status gateway } } }`, { id: map.orders[o.id] });
  if (d.order.refunds.length) { map.refunds[r.id] = d.order.refunds[0].id; continue; }
  map.refunds[r.id] = await recordRefund(map.orders[o.id]!, r.amount, r.reason, `seed-${r.id}`);
  console.log(`+ refund ${r.id} ${map.refunds[r.id]}`);
}
await save();
console.log(`seeded: ${Object.keys(map.customers).length} customers, ${Object.keys(map.orders).length} orders, ${Object.keys(map.refunds).length} refunds → ${MAP_PATH}`);

function background() {
  let seed = 20260927;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 2 ** 32; return seed / 2 ** 32; };
  const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]!;
  const people: [string, string][] = [
    ["Grace Okafor", "1520 N Damen Ave, Chicago, IL 60622, US"], ["Marcus Webb", "301 E 6th St, Austin, TX 78701, US"],
    ["Elena Rossi", "45 Bleecker St, New York, NY 10012, US"], ["Noah Fischer", "2200 Colorado Ave, Santa Monica, CA 90404, US"],
    ["Aisha Rahman", "18 Beacon St, Boston, MA 02108, US"], ["Kenji Watanabe", "600 Pine St, Seattle, WA 98101, US"],
    ["Chloé Martin", "8 rue de la Roquette, 75011 Paris, FR"], ["Lukas Braun", "Oranienstraße 25, 10999 Berlin, DE"],
    ["Sofia Lindqvist", "1234 SE Division St, Portland, OR 97202, US"], ["Diego Hernández", "940 Valencia St, San Francisco, CA 94110, US"],
    ["Hannah Cohen", "77 W Washington St, Denver, CO 80202, US"], ["Oliver Hughes", "22 Shoreditch High St, London E1 6PG, GB"],
    ["Mei Chen", "315 Spadina Ave, Toronto, ON M5T 2E9, CA"], ["Jamal Carter", "1400 U St NW, Washington, DC 20009, US"],
    ["Isabel Duarte", "2100 N Mill St, Nashville, TN 37208, US"], ["Ryan O'Neill", "55 Water St, Brooklyn, NY 11201, US"],
    ["Priya Shah", "480 Castro St, Mountain View, CA 94041, US"], ["Tobias Klein", "Schanzenstraße 14, 20357 Hamburg, DE"],
    ["Emma Johansson", "3300 Fremont Ave N, Seattle, WA 98103, US"], ["Carlos Mendes", "250 Rue Saint-Paul, Montreal, QC H2Y 1H3, CA"],
  ];
  const methods = ["Visa ending 4417", "Mastercard ending 2290", "Amex ending 3008", "PayPal", "Apple Pay", "Shop Pay"];
  const customers = people.map(([name, addr]) => ({
    email: `${name.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").replace(/ /g, ".")}@example.com`, name,
    plan: pick(["Standard", "Standard", "Plus"]), since: `2025-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 28)).padStart(2, "0")}`,
    defaultAddress: addr, paymentMethods: [pick(methods)], newsletter: rnd() < 0.5, status: "active",
  }));
  // Baskets of 1-3 catalog products.
  const skus = fixtures.products.map((p: any) => p.sku as string);
  const baskets = Array.from({ length: 16 }, () => Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => pick(skus)));
  const taken = new Set(fixtures.orders.map((o) => o.id));
  const orders: any[] = [], refunds: any[] = [];
  const TODAY = Date.parse("2026-09-27T00:00:00Z");
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  for (let i = 0; i < 48; i++) {
    const ageDays = Math.floor((29 * (48 - i)) / 48 + rnd() * 1.5); // spread over the last 30 days, oldest first
    const placed = TODAY - ageDays * 86400000;
    let n = 10820 + Math.round(((29 - ageDays) / 29) * 590) + Math.floor(rnd() * 6);
    while (taken.has(`KC-${n}`)) n++;
    const id = `KC-${n}`; taken.add(id);
    const c = pick(customers);
    const items = pick(baskets).map((sku) => { const p: any = fixtures.products.find((x: any) => x.sku === sku)!; return { sku, name: p.name, price: p.price }; });
    const subtotal = items.reduce((s, x) => s + x.price, 0);
    const shipping = c.defaultAddress.endsWith("US") ? (c.plan !== "Standard" || subtotal > 60 ? 0 : 6) : 29;
    const r = rnd();
    const status = ageDays <= 1 ? "processing" : r < 0.07 ? "cancelled" : ageDays <= 5 ? (r < 0.5 ? "processing" : "shipped") : ageDays <= 9 ? "shipped" : "delivered";
    const dhl = !c.defaultAddress.endsWith("US");
    const o: any = {
      id, email: c.email, items, total: subtotal + shipping, status, placedAt: iso(placed), shipTo: c.defaultAddress,
      payment: { method: c.paymentMethods[0], status: status === "cancelled" ? "refunded" : "paid" }, invoiceId: `INV-${n + 10000}`,
    };
    if (status === "shipped" || status === "delivered") {
      o.tracking = dhl ? `DHL44719${String(n).padStart(5, "0")}` : `1Z999AA101234${String(n).padStart(5, "0")}`;
      o.shippedAt = iso(placed + 86400000);
      if (status === "delivered") o.deliveredAt = iso(placed + (dhl ? 7 : 4) * 86400000);
    }
    if (status === "cancelled") refunds.push({ id: `RF-${n}`, orderId: id, amount: o.total, reason: "Customer changed their mind before shipping", status: "sent" });
    else if (status === "delivered" && rnd() < 0.18) {
      const cheapest = items.reduce((a, b) => (a.price <= b.price ? a : b));
      refunds.push({ id: `RF-${n}`, orderId: id, amount: cheapest.price, reason: pick([`${cheapest.name} arrived damaged`, `${cheapest.name} missing from parcel`, "Goodwill refund for late delivery"]), status: "sent" });
      o.payment.status = "partially_refunded";
    }
    orders.push(o);
  }
  return { customers, orders, refunds };
}
