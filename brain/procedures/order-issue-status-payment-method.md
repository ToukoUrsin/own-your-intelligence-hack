---
title: "Procedure: Status Payment Method (Order Issue)"
type: procedure
intent: status_payment_method
flow: order_issue
---

# Status Payment Method (Order Issue)

Request type `status_payment_method` in the order issue family (get status of an order or change an order, possibly shipping).

Customers typically write:
- "Hello, can you check the status of an order for me. The payment says debit card but I payed with my credit card. Chloe Zhang"
- "I just want to check on my order because my statement show that I paid with credit card but I didn't think that was the method I had chosen. I just want to make sure the order is good. David Williams VMUEOE6QJB"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. Find out whether the item has already shipped.
   - Ask for the shipping status from the customer and enter into `shipping_status`
   - If the item is 'Order Received' or 'In Transit', then you can change the payment method immediately (go to the next step).
   - If the item is 'Out for Delivery' or 'Delivered' then the new payment method only applies to future orders (explain to the customer and see if they still want to change payment method).
4. Change the payment method
   - Enter in the new, desired payment method which can be credit card, debit card or paypal
   - Select the `update_order` option with the new payment method

## Notes
- The customer believes the payment method is wrong.  Valid payment methods are credit card, debit card and PayPal.  The customer may want to change their payment method.
- Whether or not the conversation is successful depends on how happy you think the customer ended up. There is no right or wrong answer, just make your best judgement.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `shipping_status` → `update_order`


Wrap up by asking whether the customer needs anything else.
