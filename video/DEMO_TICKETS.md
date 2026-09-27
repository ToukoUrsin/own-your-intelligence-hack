# Demo tickets (QM live demo, Northwind Outfitters)

Subflow: `manage_cancel` (remove one item from an order → `offer_refund` on the Shopify order).
Both orders are seeded in the Shopify dev store (data/shopify-map.json). Paste each ticket into a **new chat** at http://localhost:8084.

## Setup before recording
1. `hack/up.sh` in the QM fork (already running on :8081/8082/8084).
2. `mcp/demo.sh` in this repo: restarts the MCP (SHOP_BACKEND=shopify, fresh Shopify cache, River normalizer, RECALL_BACKEND=memorable)
   on `replay/demo-procedures.jsonl` = the finished label-run store without `manage_cancel`, plus `.memorable-home-demo`
   (Memorable home copy whose slug map drops manage_cancel). A explores and saves into Memorable; B recalls. Rerun to reset
   between takes. `MEMORABLE=0 mcp/demo.sh` = local store only (if Memorable 429s again; recall falls back to local anyway).
3. QM branding: Northwind Support / Northwind Outfitters; MCP registered as `northwind` (tools `northwind_*`).

## Primary pair (#2) — all orders verified unrefunded in Shopify at 15:32
### A — explore (T0366, Joyce Wu, order 7780111249 out for delivery: Gale shirt $64 + Kline jacket $84)
```
From: joycewu709@example.com
I got a shirt for my husband, but he doesn't like it, so now I need to take it off my order. Can you help me do that? I don't want to cancel the whole order, just the men's Gale shirt portion No, but it says it's out for delivery.
```
Expected: **EXPLORED** → "New path saved to Memorable: manage_cancel"; $64 refund on 7780111249.

### B — recall (T0293, Norman Bouchard, order 3536918602 out for delivery: Mercer shirt $99 + Mercer boots $54)
```
From: normanbouc398@example.com
Hey! I placed a two item order, but I want to remove the second item. I totally chose the wrong size. Norman Bouchard
```
Expected: **RECALLED PATH** (found in Memorable memory), $54 refund on 3536918602, no follow-up needed ("second item").

## Retake pair (#3) — verified unrefunded 15:32
A (T0124, Alessandro Phoenix, 7494854496: Mercer jeans $69 + Gale shirt $99 → removes Gale shirt $99):
```
From: alessandro390@example.com
Hi, I just placed an order but I need to remove the 2nd thing on my order. I think i chose the wrong size. yes, it's Alessandro Phoenix
```
B (T0298, David Williams, 7889212367: Kline jeans $49 + Kline shirt $49 → Kline shirt $49):
```
From: davidwilli700@example.com
Hi, want to remove a second it my order I accidentally choose the wrong size David Williams
```
Rerun `mcp/demo.sh` before the retake so A explores again.

## Compiled tickets (refund status, plan-refund-status, 0 model calls)
Primary (T0003):
```
From: crystalm392@example.com
I am looking for the status of my refund. Crystal Minh
```
Spares (T0053, T0038):
```
From: crystalm123@example.com
I was getting a refund on my order and I just want to check on the status of it. Crystal Minh
```
```
From: sanyaafzal525@example.com
Hey, can I check on the status of my refund? Thanks! Sanya Afzal
```

## Rehearsal (27 Sep 15:26–15:30 PDT, pair #1, real QM UI)
| Shot | Ticket | Result | Panel | Wall clock |
|---|---|---|---|---|
| A | T0123 Sanya (8028265568) | EXPLORED, saved manage_cancel, $69 Kline jeans refunded | 32.6 s · $0.19 · 9 calls | ~41 s to reply |
| B | T0376 Chloe (0867025956) | RECALLED PATH, sim 1.00, no search_kb, $94 Harbor shirt refunded, no follow-up | 19.8 s · $0.12 · 9 calls | ~24 s |
| C | T0003 Crystal | COMPILED, 0 model calls, 3 steps ✓, plan JSON expander opens | 1 ms · $0.00 | ~1 s |
Shopify refunds: 1110046966128 ($69), 1110046998896 ($94). That rehearsal ran on the local store (Memorable was 429).
At 15:31 `mcp/demo.sh` switched to Memorable recall (quota back): check pair T0289 → EXPLORED ("searched Memorable memory",
recall_path ~5 s, save_path ~8 s via Memorable ingest; T0289 asks which item, so it needed a follow-up), then T0370 →
RECALLED PATH "found in Memorable memory". Expect A ~45 s with Memorable (ingest adds ~8 s).

## Consumed orders (refunded; do not use)
T0093 3609246296, T0075 1086743837, T0123 8028265568, T0376 0867025956, T0289 3350562053. T0370 5653262410 was left
mid-question (unrefunded) but its chat exists; skip it.
