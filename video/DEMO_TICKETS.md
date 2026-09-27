# Demo tickets (QM live demo, Northwind Outfitters)

Subflow: `manage_cancel` (remove one item from an order → `offer_refund` on the Shopify order).
Both orders are seeded in the Shopify dev store (data/shopify-map.json). Paste each ticket into a **new chat** at http://localhost:8084.

## Setup before recording
1. `hack/up.sh` in the QM fork (already running on :8081/8082/8084).
2. `mcp/demo.sh` in this repo: restarts the MCP (SHOP_BACKEND=shopify, fresh Shopify cache) on `replay/demo-procedures.jsonl`,
   a copy of the replay's procedure store without `manage_cancel`. The full replay learns every tickets.jsonl subflow, so
   without this A would recall instead of explore. Rerun it to reset between takes.
3. QM branding: Northwind Support / Northwind Outfitters; MCP registered as `northwind` (tools `northwind_*`).

## Ticket A — explore (T0093, Norman Bouchard, bronze, order in transit)
```
From: normanbouc506@example.com
Hello I would like to remove a pair of Gale jeans from my order! I added them on accident.
```
Expected: Paths panel **EXPLORED + saved new path** (~25 s, ~$0.23, 9 calls: recall_path miss → pull_up_account, search_kb,
verify_identity, shipping_status, find_orders, membership, offer_refund, save_path). Reply: order in transit, bronze member,
$54 refunded to PayPal now, return label when it arrives. Shopify: refund $54 on order 3609246296.

## Ticket B — recall (T0075, Joseph Banter, bronze, order not shipped)
```
From: josephbant522@example.com
I recently ordered 2 jackets and need to have one of them removed from my order. Joseph Banter
```
Expected: **RECALLED PATH** (~15 s, ~$0.09, 6 calls, no search_kb). Agent lists Harbor $94 / Mercer $69 and asks which one.
Follow-up in the same chat:
```
The Harbor jacket please
```
Expected: one `offer_refund` call (turn stays RECALLED PATH), $94 refunded. Shopify: refund $94 on order 1086743837.

## Verified run (27 Sep, 14:44–14:47 PDT)
A = EXPLORED (saved proc manage_cancel), B = RECALLED PATH; Shopify refunds 1110045622640 ($54) and 1110045852016 ($94).
Caveat for re-takes: these orders are now refunded (3609246296 has only $10 left; an earlier test also refunded $74 there, a
wrong catalog price since fixed in the soul). A re-take needs fresh manage_cancel orders, e.g. T0123 (sanyaafzal812@example.com,
second item Kline jeans $69) and T0293 (normanbouc398@example.com, Mercer boots $54) once seeded; check data/shopify-map.json,
then rerun `mcp/demo.sh`.
