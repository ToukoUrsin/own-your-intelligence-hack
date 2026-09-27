---
title: "Procedure: Update Refund (Product Defect)"
type: procedure
intent: refund_update
flow: product_defect
---

# Update Refund (Product Defect)

Request type `refund_update` in the product defect family (refunds and returns).

Customers typically write:
- "I want to find out about my refund i want to add something else to it Joseph Banter"
- "Hi. I've already submitted a refund request, but I'd like to add something else to that. Can you help me  with that? Toe box is too narrow. Too bad, cute boots. I've got my order number if that helps."
- "hello  i want to know the state of my refund i have an item i would actually love to add to the existing refund my name is Joyce Wu"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Confirm that their purchase is valid with `validate_purchase`:
   - Username - occasionally, the customer may not remember their username.  In this case, use the Recover Username subflow in the Account Access flow
   - Email Address
   - Order ID - you may have gotten this already to perform the status check
3. Find out the new item they want to return:
   - Get the brand and type, such as 'Old Navy Socks' or 'Nike Shoes'
   - Enter this into the input box and `record_reason`
4. Get the dollar amount to refund
   - Ask for the price of the product from the customer
   - The total refund is the amount of their previous refund plus their current one. > ie. if their old amount is $100 and their new item is $30, then the total is '130'
   - Enter the amount (without dollar sign) and then click `offer_refund`

## Notes
- The customer is adding an extra item to their existing refund.  If you have not yet gotten it, ask the customer for their reason for refunding.
- As always, wrap up by nicely asking if the customer needs any further assistance.


## Required actions (in order)
`pull_up_account` → `validate_purchase` → `record_reason` → `offer_refund`


Wrap up by asking whether the customer needs anything else.
