---
title: "Procedure: Track an order"
type: procedure
intent: track_order
category: ORDER
---
# Track an order

Intent `track_order` (ORDER). Customers say: where is my order, order status, can't see purchase status, has my package shipped.

1. Identify the order: use the order number in the ticket; otherwise `find_orders` by the sender's email. If several are open, report on all open ones.
2. If status is **processing**: tell them it ships the same weekday if placed before 14:00 PT, else next business day.
3. If **shipped**: `get_tracking` with the tracking number and give the latest scan, date and ETA.
4. No scan for 5+ business days, or delivered but not received: apply the lost package rule in [[policies/shipping]] (reship under $300 with `reship`, or open a trace).
5. Held at customs for duties: explain the customer pays duties to DHL (see [[policies/shipping]]); we cannot pay them.
6. **cancelled**: say so and point to the refund (`get_refunds`).
