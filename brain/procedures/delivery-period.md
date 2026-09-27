---
title: "Procedure: Delivery time / when will it arrive"
type: procedure
intent: delivery_period
category: DELIVERY
---
# Delivery time / when will it arrive

Intent `delivery_period` (DELIVERY). Customers say: how soon will my item arrive, delivery ETA, how long does shipping take.

1. If they ask about an existing order: find it (`find_orders` by order number or email) and use `get_tracking` for the ETA.
2. If the order is still processing, estimate: ship date (same weekday before 14:00 PT) + transit time from [[policies/shipping]].
3. General question with no order: give the transit times per option from [[policies/shipping]].
