---
title: "Procedure: Manage Upgrade (Order Issue)"
type: procedure
intent: manage_upgrade
flow: order_issue
---

# Manage Upgrade (Order Issue)

Request type `manage_upgrade` in the order issue family (get status of an order or change an order, possibly shipping).

Customers typically write:
- "I want to confirm whether my package is in transit Alessandro Phoenix"
- "Hello, can you help me with upgrading my shipping I want to get my order as soon as possible My name is Joseph Banter"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. Find out whether the item has already shipped.
   - Ask for the shipping status from customer, and enter into `shipping_status` > Possible options: `'Order Received', 'In Transit', 'Out for Delivery', 'Delivered'`
   - If the item is 'Order Received' > Then the company has received the order, but the item has not yet shipped > Move onto the next step
   - If the item is 'In Transit', 'Out for Delivery', or 'Delivered' then it is too late > The item has already shipped and the date cannot be altered > However, this means the item will likely arrive today or tomorrow anyway > Explain this to the customer and `End Conversation`
4. Find out how much the extra fee will be for upgraded overnight shipping
   - Ask the customer for their membership level.  Type it into the field and then select the `membership` option.
   - Gold members: > Gold members have their fee waived
   - Guest, Bronze or Silver members: > Ask them if they can charge $20 to the credit card on their account > The answer should be yes, since that is the only way to pay
5. Finally, you want to upgrade their shipping time.
   - Enter 'tomorrow' and then select `update_order`

## Notes
- The customer wants to upgrade to overnight shipping.
- If the shipping date cannot be changed, then apologize to the customer and remember to mark the conversation as complete, but not successful in the survey.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `shipping_status` → `membership` → `update_order`


Wrap up by asking whether the customer needs anything else.
