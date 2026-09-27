---
title: "Procedure: Manage Cancel (Order Issue)"
type: procedure
intent: manage_cancel
flow: order_issue
---

# Manage Cancel (Order Issue)

Request type `manage_cancel` in the order issue family (get status of an order or change an order, possibly shipping).

Customers typically write:
- "I recently ordered 2 jackets and need to have one of them removed from my order. Joseph Banter"
- "Hello I would like to remove a pair of Gale jeans from my order! I added them on accident."
- "Hi I just placed an order but I accidentally chose the wrong size for the second item and would like to remove it from the order I did not mean to buy the second item and was hoping you could help me modify the account"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. Find out whether the item has already shipped.
   - Ask customer for the shipping status and then submit using `shipping_status`
   - If the item is Order Received, then immediately offer the refund and tell the customer the unwanted item has been removed from their order.
   - If the item is 'In Transit', 'Out for Delivery' or 'Delivered' then check their membership level (next step).
4. Ask the customer for their membership level.
   - If they are bronze, silver or gold: > Enter Gold or Silver, depending on the level into the text box > Click the `membership` option > Tell them you can offer a refund immediately.  After the item arrives, the customer should then call back to customer support to get the shipping label for return.
   - If they are a Guest customer, then they must wait until the item arrives and call back to customer support to start the return process. `End Conversation` after communicating the above.
5. Find out how much the item cost that is meant to be returned
   - Enter the amount in the box
   - Select the `offer_refund` option

## Notes
- The customer accidentally ordered two items when they meant to order just one.
- Whether or not the conversation is successful depends on how happy you think the customer ended up. There is no right or wrong answer, just make your best judgement.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `shipping_status` → `membership` → `offer_refund`


Wrap up by asking whether the customer needs anything else.
