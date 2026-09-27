---
title: "Procedure: Manage Shipping (Shipping Issue)"
type: procedure
intent: manage
flow: shipping_issue
---

# Manage Shipping (Shipping Issue)

Request type `manage` in the shipping issue family (check our update a shipment of an item).

Customers typically write:
- "Hey I was trying to track one of my goods but the effort was in vain David Williams"
- "Hi . I’ve ordered wrong item I think and needed to change shipping Norman Bouchard"
- "I need to change my shipping information for my order Rodriguez Domingo"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by gathering the shipping status from the customer
   - Options include: 'Order Received',  'In Transit', 'Out for Delivery', or 'Delivered'
   - This should input using `shipping_status`
3. To confirm that their purchase is valid with `validate_purchase`:
   - Username - occasionally, the customer may not remember their username.  In this case, use the Recover Username subflow in the Account Access flow
   - Email Address
   - Order ID
4. Finally, perform the action for the customer by updating their order
   - Enter the type of change they want to make: > Options: 'Change address' or 'Change order'
   - Then click the `update_order` button

## Notes
- The customer wants to change or update something about their shipment -- either changing address or change order because they ordered the wrong item.  If they want to cancel because the cost is too high, check the 'Shipping Cost' flow below.
- The system will send a notification in the chat, but also assure the customer that their order has been updated.  As usual, end the conversation by asking if they need anything else and fill out the survey.


## Required actions (in order)
`pull_up_account` → `shipping_status` → `validate_purchase` → `update_order`


Wrap up by asking whether the customer needs anything else.
