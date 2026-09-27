---
title: "Procedure: Cancel an order"
type: procedure
intent: cancel_order
category: ORDER
---
# Cancel an order

Intent `cancel_order` (ORDER). Customers say: cancel my order, cancel purchase, don't want it anymore.

1. Find the order (order number, else `find_orders` by email; if several are processing, ask which one or cancel the one they name).
2. **processing** → `cancel_order`. Full refund to the original payment method, no fee. Confirm the refund amount.
3. **shipped** → cannot cancel; offer a return after delivery under [[policies/returns-refunds]] (30 days, unused).
4. **delivered** → treat as a return request ([[procedures/get-refund]]).
5. Already **cancelled** → confirm and give refund status (`get_refunds`).
