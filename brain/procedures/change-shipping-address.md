---
title: "Procedure: Change shipping address on an order"
type: procedure
intent: change_shipping_address
category: SHIPPING
---
# Change shipping address on an order

Intent `change_shipping_address` (SHIPPING). Customers say: wrong address, change delivery address, I moved, edit address on order.

1. Find the order (order number, else the sender's open orders by email).
2. **processing** → `change_shipping_address` with the full new address (ask for it if missing). Confirm the new address back.
3. **shipped** → we cannot change it; tell them to redirect with UPS My Choice (UPS) or DHL On Demand Delivery (DHL) using the tracking number.
4. Also offer to update their default address ([[procedures/set-up-shipping-address]]).
