---
title: "Procedure: Refund Status (Product Defect)"
type: procedure
intent: refund_status
flow: product_defect
---

# Refund Status (Product Defect)

Request type `refund_status` in the product defect family (refunds and returns).

Customers typically write:
- "I am looking for the status of my refund Crystal Minh"
- "I want to know state of refund Name: Joseph Banter  Phone Number: (652) 704-5471  Member Level: Gold  Email Address: josephbanter363@example.com  Username: josephbanter363"
- "Yes I am checking on the status of my refund I am Sanya Afzal the refund should be processed in my name"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Gather details to find the appropriate order:
   - Username - first
   - Email Address - second
   - Order ID - third
   - Then use a KB query to `validate_purchase`
3. Respond with the information to the customer in natural language
   - Pick a refund status from the list of three options > not started, in progress, complete
   - Tell the customer this is their refund status
   - Pick a payment method from the following three options > online, by phone, by chat
   - Tell the customer this is how they initiated that refund (i.e their payment method)
4. If the customer is not satisfied with your answer, and would like to change their refund
   - If they do not like the status: > Enter 'manager' into `notify_team` > Explain that you have escalated the issue to the manager
   - If they do not like the payment method: > Enter “change method” into `update_order`

## Notes
- Customers want to know the status and payment method of their refund.  In this case:
- As usual, end by asking if the customer needs anything else.


## Required actions (in order)
`pull_up_account` → `validate_purchase` → `notify_team` → `update_order`


Wrap up by asking whether the customer needs anything else.
