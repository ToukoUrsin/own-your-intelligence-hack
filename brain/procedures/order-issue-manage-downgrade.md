---
title: "Procedure: Manage Downgrade (Order Issue)"
type: procedure
intent: manage_downgrade
flow: order_issue
---

# Manage Downgrade (Order Issue)

Request type `manage_downgrade` in the order issue family (get status of an order or change an order, possibly shipping).

Customers typically write:
- "Hi Can i change my shipping preference to next week delivery"
- "Hello i wanted to move my shipping to next week delivery I want to avoid any shipping fee"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. Find out whether the item has already shipped.
   - Ask for the shipping status from customer, and enter into `shipping_status` > Possible options: `'Order Received', 'In Transit', 'Out for Delivery', 'Delivered'`
   - If the item is 'Order Received' > Then the company has received the order, but the item has not yet shipped > Move onto the next step
   - If the item is 'In Transit', 'Out for Delivery', or 'Delivered' then it is too late > The item has already shipped and the date cannot be altered > Then move onto the next step
4. Determine how to manage the shipping cost
   - Find the membership level and enter into `membership`
   - If Gold, Silver or Bronze: > If not yet shipped, tell the customer you can delay the shipping date with no problem.  Then head to the next step. > If already shipped, tell the customer you can add a credit back to their account for the amount of the shipping fee.  Then  `End Conversation`
   - If Guest member: > If not yet shipped, tell the customer you can delay the shipping date with no problem.  Then head to the next step. > If already shipped, tell the customer there is nothing you can do.  Apologize for any inconvenience and `End Conversation`
5. If the item has not yet been shipped, then you can change it
   - Enter 'next week' into the field and `update_order`
   - Finally ask if they need anything else and `End Conversation`

## Notes
- The customer wants to downgrade to next week delivery to save on shipping fees.  If the customer wants a refund it is likely Shipping Issue > Shipping Cost instead.
- Whether or not the conversation is successful depends on how happy you think the customer ended up. There is no right or wrong answer, just make your best judgement.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `shipping_status` → `membership` → `update_order`


Wrap up by asking whether the customer needs anything else.
