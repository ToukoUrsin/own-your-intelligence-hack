---
title: "Procedure: Status Delivery Time (Order Issue)"
type: procedure
intent: status_delivery_time
flow: order_issue
---

# Status Delivery Time (Order Issue)

Request type `status_delivery_time` in the order issue family (get status of an order or change an order, possibly shipping).

Customers typically write:
- "Hello I would like to check the status of my order. The delivery time is wrong and I need it to be changed. Sure"
- "hi, i need to change my delivery time i would like to get it in the morning asap Rodriguez Domingo"
- "Hello, I would like to check the status of my order as the delivery time is wrong and needs to be changed Rodriguez Domingo"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. To decide whether or not this is a valid error:
   - Check if the company made error by 'Asking the Oracle' which will return Yes or No
   - If this was a company mistake (Oracle says Yes), skip the next step
   - Make sure to explain the result in natural language.
4. If Oracle Says No, this means the customer possibly made an error
5. x

## Notes
- The customer believes the delivery time is wrong and wants to move from morning to evening.  If the customer is just confirming a date, then the flow might be Shipping Issue > Status instead.
- If the delivery cannot be changed, then apologize to the customer and remember to mark the conversation as complete, but not successful in the survey.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `check_system` → `shipping_status` → `update_order`


Wrap up by asking whether the customer needs anything else.
