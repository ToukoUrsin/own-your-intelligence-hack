---
title: "Procedure: Manage Create (Order Issue)"
type: procedure
intent: manage_create
flow: order_issue
---

# Manage Create (Order Issue)

Request type `manage_create` in the order issue family (get status of an order or change an order, possibly shipping).

Customers typically write:
- "Hi i want to add a new item to my order because i forgot to add it before. yes, order id 9621926017 Name: Norman Bouchard"
- "Hi, can I add one more item to an order I placed? The order ID is 5945282115 Albert Sanders"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. Find out whether the item has already shipped.
   - Ask the customer for the shipping status, and enter into `shipping_status`
   - If the item is Order Received, then skip the next step and directly update the order.
   - If the item is 'In Transit', 'Out for Delivery', or 'Delivered' then it is too late.  Move to the next step (membership level).
4. Silver and Gold members get special treatment.  Ask the customer for their membership level, if they qualify:
   - Enter the Gold or Silver level.  Their existing order is already out for delivery, so instead you will ship the new item to them ASAP in a separate order with no shipping fee.
   - Choose the `membership` option
5. To add to an item to the order you will need to enter its name
   - Enter a phrase of brand and item, such as 'Gale Jeans' or 'Kline Shirt'
   - Then select `make_purchase`

## Notes
- The customer wants to add something to their existing order.
- If the new item cannot be added to the order, then apologize to the customer and remember to mark the conversation as complete, but not successful in the survey.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `shipping_status` → `membership` → `make_purchase`


Wrap up by asking whether the customer needs anything else.
