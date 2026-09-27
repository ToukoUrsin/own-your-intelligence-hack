---
title: "Procedure: Manage Change Phone (Manage Account)"
type: procedure
intent: manage_change_phone
flow: manage_account
---

# Manage Change Phone (Manage Account)

Request type `manage_change_phone` in the manage account family (subscription service added or removed, change profile info).

Customers typically write:
- "Good morning. I would like to update my phone number please my phone number  you have is 518 0192780 and it should be 518 019 3780"
- "Hello I think the phone number on my account is incorrect Chloe Zhang"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. To change the phone number, they must be able to provide their current number.
   - Format should be (XXX) XXX-XXXX
   - Enter this information and click `record_reason`
3. Verify the identity of the customer.  They must provide 3 out of 7 of the items below which you you enter into `verify_identity`
   - Zip Code
   - Telephone Number
   - PIN Number
   - Username
   - Password
   - Email Address
   - Order ID of previous purchase
4. Ask for the new, desired value. Format should be (XXX) XXX-XXXX
   - Enter this info and select `update_account`
   - Tell them everything has been updated in the system

## Notes
- The customer wants to manage their phone number.
- Whether or not the conversation is successful depends on how happy you think the customer ended up. There is no right or wrong answer, just make your best judgement. 


## Required actions (in order)
`pull_up_account` → `record_reason` → `verify_identity` → `update_account`


Wrap up by asking whether the customer needs anything else.
