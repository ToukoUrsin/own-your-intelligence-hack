---
title: "Procedure: Change an order"
type: procedure
intent: change_order
category: ORDER
---
# Change an order

Intent `change_order` (ORDER). Customers say: change my order, add or remove an item, swap product, update quantity.

1. Find the order. Only **processing** orders can be edited.
2. Use `edit_order` to add or remove SKUs (see `list_products` for SKUs). Price difference is charged or refunded to the original payment method automatically.
3. Address changes: see [[procedures/change-shipping-address]].
4. Already shipped: cannot edit. Offer a return of unwanted items and a new order for the rest.
