// Mock shop backend (synthetic data) for Kettle & Co.
export type Order = {
  id: string; email: string; items: { sku: string; name: string; price: number; serial?: string }[];
  total: number; status: "processing" | "shipped" | "delivered";
  tracking?: string; shippedAt?: string; deliveredAt?: string;
};

export const orders: Record<string, Order> = {
  "KC-10421": { id: "KC-10421", email: "maya.lin@example.com", items: [{ sku: "BO-1", name: "Burr One", price: 249, serial: "BO-5512" }], total: 249, status: "delivered", tracking: "1Z999AA10123450001", shippedAt: "2026-07-29", deliveredAt: "2026-08-02" },
  "KC-10988": { id: "KC-10988", email: "dev.patel@example.com", items: [{ sku: "PKP-1", name: "Pour Kettle Pro", price: 139, serial: "2608-11473" }], total: 139, status: "delivered", tracking: "1Z999AA10123452222", shippedAt: "2026-09-07", deliveredAt: "2026-09-10" },
  "KC-11102": { id: "KC-11102", email: "dev.patel@example.com", items: [{ sku: "BEAN-M", name: "Medium roast 340 g", price: 22 }, { sku: "BEAN-D", name: "Dark roast 340 g", price: 22 }], total: 44, status: "shipped", tracking: "1Z999AA10123456784", shippedAt: "2026-09-19" },
  "KC-11230": { id: "KC-11230", email: "sam.ortiz@example.com", items: [{ sku: "BO-MINI", name: "Burr Mini", price: 129 }], total: 129, status: "shipped", tracking: "1Z999AA10123459999", shippedAt: "2026-09-24" },
};

// Last carrier scan per tracking number.
const tracking: Record<string, { lastScan: string; date: string; delivered: boolean }> = {
  "1Z999AA10123450001": { lastScan: "Delivered, front door", date: "2026-08-02", delivered: true },
  "1Z999AA10123452222": { lastScan: "Delivered, mailroom", date: "2026-09-10", delivered: true },
  "1Z999AA10123456784": { lastScan: "Departed facility, Reno NV", date: "2026-09-19", delivered: false },
  "1Z999AA10123459999": { lastScan: "Out for delivery, Portland OR", date: "2026-09-27", delivered: false },
};

export const actions: { type: string; orderId: string; detail: string }[] = [];

export function findOrders(query: { orderId?: string; email?: string }) {
  if (query.orderId) return orders[query.orderId] ? [orders[query.orderId]] : [];
  if (query.email) return Object.values(orders).filter((o) => o.email === query.email?.toLowerCase());
  return [];
}

export function getTracking(trackingNumber: string) {
  return tracking[trackingNumber] ?? null;
}

export function issueRefund(orderId: string, amount: number, reason: string) {
  const o = orders[orderId];
  if (!o) return { ok: false, error: "order not found" };
  if (amount > o.total) return { ok: false, error: "refund exceeds order total" };
  actions.push({ type: "refund", orderId, detail: `$${amount}: ${reason}` });
  return { ok: true, refundId: `RF-${actions.length}`, amount };
}

export function reship(orderId: string, skus: string[], reason: string) {
  const o = orders[orderId];
  if (!o) return { ok: false, error: "order not found" };
  actions.push({ type: "reship", orderId, detail: `${skus.join(",")}: ${reason}` });
  return { ok: true, newOrderId: `${orderId}-R${actions.length}` };
}

export function sendPart(orderId: string, sku: string, reason: string) {
  actions.push({ type: "send_part", orderId, detail: `${sku}: ${reason}` });
  return { ok: true, shipmentId: `PT-${actions.length}` };
}
