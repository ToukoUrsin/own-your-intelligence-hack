---
title: "Procedure: Manage Change Name (Manage Account)"
type: procedure
intent: manage_change_name
flow: manage_account
---

# Manage Change Name (Manage Account)

Request type `manage_change_name` in the manage account family (subscription service added or removed, change profile info).

Customers typically write:
- "Hello, i would like to change the name on my account because the name is spelled incorrectly. Okay yes"
- "Hello! My name is Joseph Banter I want to change my name on my account it is not spelled right!"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. If they are trying to change the name on the account, they must be able to provide their current full name.
   - Get the current first and last name, such as 'George Constanza'
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
   - For example 'Jerry Seinfeld'
   - Enter this info and select `update_account`
   - Tell them everything has been updated in the system

## Notes
- The customer wants to manage their name.
- If nothing works, just apologize and end the conversation. Whether or not the conversation is successful depends on how happy you think the customer ended up. There is no right or wrong answer, just make your best judgement.


## Required actions (in order)
`pull_up_account` → `record_reason` → `verify_identity` → `update_account`


Wrap up by asking whether the customer needs anything else.
