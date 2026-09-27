---
title: "Procedure: Manage Payment Method (Manage Account)"
type: procedure
intent: manage_payment_method
flow: manage_account
---

# Manage Payment Method (Manage Account)

Request type `manage_payment_method` in the manage account family (subscription service added or removed, change profile info).

Customers typically write:
- "I would like to update my Primary payment because it not showing up correctly ok it not the correct information"
- "Hi! Can you help me with my account? I need to change my payment method. The last time I checked it was paypal and I don't use paypal anymore. Can I change it to credit card? Joseph Banter"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. To change payment method, ask for their current payment method
   - Options include `'credit card', 'debit card', 'paypal'`
   - Enter this information and click `record_reason`
3. Verify the identity of the customer.  They must provide 3 out of 7 of the items below which you you enter into `verify_identity`
   - Zip Code
   - Telephone Number
   - PIN Number
   - Username
   - Password
   - Email Address
   - Order ID of previous purchase
4. Ask for the new, desired value.
   - Options include `'credit card', 'debit card', 'paypal'`
   - Enter this info and select `update_account`
   - Tell them everything has been updated in the system

## Notes
- The customer wants to manage their payment method.
- Whether or not the conversation is successful depends on how happy you think the customer ended up. There is no right or wrong answer, just make your best judgement. 


## Required actions (in order)
`pull_up_account` → `record_reason` → `verify_identity` → `update_account`


Wrap up by asking whether the customer needs anything else.
