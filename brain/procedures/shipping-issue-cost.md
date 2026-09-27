---
title: "Procedure: Shipping Cost (Shipping Issue)"
type: procedure
intent: cost
flow: shipping_issue
---

# Shipping Cost (Shipping Issue)

Request type `cost` in the shipping issue family (check our update a shipment of an item).

Customers typically write:
- "Hi these shipping costs seem real high i need to check my order DOTVVB8DXL"
- "Hi! My shipping cost were way to high on my last order Joyce Wu"
- "Hi, I want to check the cost of shipping. I seems to be too high. Crystal Minh Silver Ok"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by confirming that their purchase is valid with `validate_purchase`:
   - Username - occasionally, the customer may not remember their username.  In this case, use the Recover Username subflow in the Account Access flow
   - Email Address
   - Order ID
3. Then, check to see status of their delivery
   - Ask the customer for the shipping status
   - Options include: 'Order Received',  'In Transit', 'Out for Delivery', or 'Delivered' 
   - Record the status using `shipping_status`
4. If the status is 'Order Received' or  'In Transit', then offer to waive the fee on their shipment
   - Enter 'waive fee' in the input form
   - Click on `update_order`
   - Wrap up and end the conversation
5. Alternatively, if the status is 'Out for Delivery' or 'Delivered', then the best you can do is to give them part of the shipping fee back.
   - Standard shipping is $8.00, so enter '8' into the box
   - Then click on `offer_refund`

## Notes
- The cost of shipping is too high, so the customer wants to get the shipping fee waived or get a refund of the shipment cost.   If an 'order' is mentioned, 'shipping cost' is probably not the right flow.   If the customer does not want a refund and instead wants to delay delivery, it is likely Order Issue > Manage > Downgrade instead.
- As always, fill out the survey afterwards.


## Required actions (in order)
`pull_up_account` → `validate_purchase` → `shipping_status` → `update_order` → `offer_refund`


Wrap up by asking whether the customer needs anything else.
