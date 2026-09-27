---
title: "Procedure: Status Quantity (Order Issue)"
type: procedure
intent: status_quantity
flow: order_issue
---

# Status Quantity (Order Issue)

Request type `status_quantity` in the order issue family (get status of an order or change an order, possibly shipping).

Customers typically write:
- "Hello, I would like to check the status of my order as I only ordered one item and my emails confirmation is saying two Norman Bouchard"
- "hi I would like to know the status of my order I ordered an Item but received a confirmation mail stating I ordered 2 items"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. To decide whether or not this is a valid error:
   - Check if the email is accurate by 'Asking the Oracle' which will return Yes or No
   - If the email was wrong (Oracle returns No), then assure the customer that they were only charged for one item and that the email was wrong. Skip the following steps and `End Conversation` after explaining.
   - If the email was right (Oracle returns Yes), then it is a company mistake.  Continue to the next step below.
4. (Only if Oracle says Yes) Find out whether the item has already shipped.
   - Ask for the shipping status from the customer and then submit using `shipping_status`
   - If the item is Order Received, then immediately offer the refund and tell the customer the unwanted item has been removed from their order.
   - If the item is 'In Transit', 'Out for Delivery' or 'Delivered' then they must wait until the item arrives and call back to customer support to start the return process.
5. (Only if Oracle says Yes) Find out how much the item cost
   - Ask the customer how much is the cost of the item meant to be returned
   - Enter that into the form and select the `offer_refund` option

## Notes
- The email confirmation of the order does not match the desired order quantity.
- Whether or not the conversation is successful depends on how happy you think the customer ended up. There is no right or wrong answer, just make your best judgement.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `check_system` → `shipping_status` → `offer_refund`


Wrap up by asking whether the customer needs anything else.
