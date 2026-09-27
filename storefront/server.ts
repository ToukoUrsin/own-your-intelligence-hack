// Public storefront chat for Northwind Outfitters: POST /chat {email, message, sessionId} -> {reply, tier, steps, ms}.
// Same pipeline as the QM demo (River router, Memorable recall, compiled plans, Shopify backend), but with its own
// copies of the procedure store, plans and Memorable map (storefront/state/) and learning off, so it never touches
// the demo store. Served publicly through Tailscale Funnel; see storefront/README.md.
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = import.meta.dir;
const STATE = join(DIR, "state");
process.env.SHOP_BACKEND ??= "shopify";
process.env.MEMORY_STORE ??= join(STATE, "procedures.jsonl");
process.env.PLANS_DIR ??= join(STATE, "plans");
process.env.MEMORABLE_HOME ??= join(STATE, "memorable-home");
process.env.SHADOW_LOG ??= join(STATE, "shadow.jsonl");
process.env.RECALL_BACKEND ??= "memorable";
process.env.ROUTER_URL ??= "http://127.0.0.1:8789/route";

const { solve } = await import("../agent/src/memory");
const shop = await import("../agent/src/shop");

const PORT = Number(process.env.PORT ?? 8795);
const TOKEN = process.env.CHAT_TOKEN ?? readFileSync(join(STATE, "token.txt"), "utf8").trim();
const PUBLIC_URL = process.env.PUBLIC_URL ?? "";
const MAX_LEN = 1000;
const RATE = 10; // requests per IP per minute
const ORIGINS = [/^https:\/\/kettle-and-co-support-hack\.myshopify\.com$/, /^https:\/\/[\w-]+\.shopifypreview\.com$/, /^https:\/\/admin\.shopify\.com$/, /^http:\/\/localhost(:\d+)?$/];

mkdirSync(join(DIR, "logs"), { recursive: true });
const log = (o: object) => appendFileSync(join(DIR, "logs/chat.jsonl"), JSON.stringify({ at: new Date().toISOString(), ...o }) + "\n");

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now(), recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE;
}

// Every tool call must stay inside the customer's own data: any email must be theirs, any order must be theirs.
const norm = (s?: string) => s?.trim().toLowerCase();
function guardFor(email: string) {
  return (tool: string, input: any) => {
    if (!input || typeof input !== "object") return;
    if (input.email && norm(input.email) !== email) throw new Error(`not allowed: ${tool} for another customer's email`);
    if (input.orderId) {
      const o = shop.findOrders({ orderId: String(input.orderId) })[0];
      if (o && norm(o.email) !== email) throw new Error(`not allowed: order ${input.orderId} belongs to another customer`);
    }
    if ((tool === "pull_up_account" || tool === "verify_identity") && !input.email) input.email = email;
  };
}

// One ticket at a time: the guard is process-wide.
let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(f: () => Promise<T>) => { const p = queue.then(f, f); queue = p.catch(() => {}); return p; };

const widget = () => readFileSync(join(DIR, "widget.js"), "utf8").replaceAll("__CHAT_TOKEN__", TOKEN).replaceAll("__CHAT_URL__", PUBLIC_URL);

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") ?? "";
  return ORIGINS.some((r) => r.test(o)) ? { "access-control-allow-origin": o, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, x-chat-token", "access-control-allow-private-network": "true", vary: "origin" } : {};
}
const json = (body: unknown, status: number, h: Record<string, string>) => Response.json(body, { status, headers: h });

Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  idleTimeout: 120,
  async fetch(req, server) {
    const url = new URL(req.url), h = cors(req);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || server.requestIP(req)?.address || "?";
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...h, ...(url.pathname === "/widget.js" ? { "access-control-allow-origin": "*", "access-control-allow-private-network": "true" } : {}) } });
    if (url.pathname === "/health") return json({ ok: true }, 200, h);
    if (url.pathname === "/widget.js") return new Response(widget(), { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache", "access-control-allow-origin": "*", "access-control-allow-private-network": "true" } });
    if (url.pathname !== "/chat") return new Response("not found", { status: 404 });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (req.method !== "POST") return json({ error: "method" }, 405, h);
    if (!h["access-control-allow-origin"] && req.headers.get("origin")) return json({ error: "origin not allowed" }, 403, h);
    if (req.headers.get("x-chat-token") !== TOKEN) return json({ error: "bad token" }, 401, h);
    if (limited(ip)) return json({ error: "Too many messages, please wait a minute." }, 429, h);
    let b: any;
    try { b = await req.json(); } catch { return json({ error: "bad json" }, 400, h); }
    const email = norm(String(b.email ?? "")), message = String(b.message ?? "").trim(), sessionId = String(b.sessionId ?? "").slice(0, 64);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return json({ error: "Please enter a valid email." }, 400, h);
    if (!message || message.length > MAX_LEN) return json({ error: `Message must be 1-${MAX_LEN} characters.` }, 400, h);
    const ticket = `${message}\n\n(from: ${email})`;
    try {
      const r: any = await serial(async () => {
        (globalThis as any).__toolGuard = guardFor(email);
        try { return await solve(ticket, { id: `web-${sessionId || Date.now()}`, learn: false }); } finally { (globalThis as any).__toolGuard = undefined; }
      });
      const out = { reply: r.reply, tier: r.tier, steps: r.steps.map((s: any) => s.tool), ms: r.ms };
      log({ ip, sessionId, email, message, ...out, modelCalls: r.modelCalls, planId: r.planId, procedureId: r.procedureId });
      return json(out, 200, h);
    } catch (e) {
      log({ ip, sessionId, email, message, error: String(e) });
      return json({ error: "Sorry, something went wrong. Please try again." }, 500, h);
    }
  },
});
console.log(`storefront chat on http://127.0.0.1:${PORT}`);
