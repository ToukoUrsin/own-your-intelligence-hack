---
title: "Procedure: Missing Item (Shipping Issue)"
type: procedure
intent: missing
flow: shipping_issue
---

# Missing Item (Shipping Issue)

Request type `missing` in the shipping issue family (check our update a shipment of an item).

Customers typically write:
- "Hi! i wanted to check on the shipping status for my package Its been 5 days and am still waiting for it Thank you"
- "Yes i still haven't received my order so i would like to check the status of my order ok Joseph Banter and my account id is WCLIGVRGVY"
- "Hi I just want to check on shipping status of my package as I don't receive my package yet. My full name is Joyce Wu"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. To confirm that their purchase is valid with `validate_purchase`:
   - Username - occasionally, the customer may not remember their username.  In this case, use the Recover Username subflow in the Account Access flow
   - Email Address
   - Order ID
3. When shipping items, it can often take a couple days for the product to arrive
   - Ask how long they have been waiting and enter the number of days into `record_reason`
4. If they have been waiting for less than a week (7 days or less), let the customer know that sometimes the package is mistakenly marked as delivered, but can still take a couple days to arrive
5. If the customer date has been waiting for a week or longer, let them know that you will ship a new order.
   - To do this, you will need their address
   - Enter the full address in one line and then click `update_order`
6. Finally resend the package
   - Ask the customer for the brand and type of the product, such as 'Gale Jeans'
   - Enter this value into the form
   - Then click the `make_purchase` button

## Notes
- The customer didn’t receive their item and wants to know what happened.
- Wrap up as usual.


## Required actions (in order)
`pull_up_account` → `validate_purchase` → `record_reason` → `update_order` → `make_purchase`


Wrap up by asking whether the customer needs anything else.
