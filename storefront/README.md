# Storefront chat

Customer chat bubble on the Northwind Outfitters dev storefront, backed by the same pipeline as the QM demo
(River router, Memorable recall, compiled plans, Shopify backend).

- `./start.sh` starts the backend on 127.0.0.1:8795 with its own procedure store, plans and Memorable map in `state/` (learning off).
- Public URL: `tailscale funnel --bg 8795` -> https://toukos-macbook-pro.tail82cd16.ts.net (`/widget.js`, `POST /chat`).
- Installed in the live theme's `layout/theme.liquid` as `<script src="https://toukos-macbook-pro.tail82cd16.ts.net/widget.js" defer>`.
- Guardrails: CORS for the store's origins, shared token in the widget, 10 requests/min per IP, 1000-char messages, every
  tool call limited to the given email's own account and orders. Logs: `logs/chat.jsonl`.
