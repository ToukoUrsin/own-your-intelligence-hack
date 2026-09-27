---
title: "Procedure: Manage Change Address (Manage Account)"
type: procedure
intent: manage_change_address
flow: manage_account
---

# Manage Change Address (Manage Account)

Request type `manage_change_address` in the manage account family (subscription service added or removed, change profile info).

Customers typically write:
- "Hi there, I noticed that my delivery address is wrong I wanted to change it Great"
- "HI! I need to change my address Future reference.  Just updating my account.  The street number is off Joyce Wu"
- "Hi! I was calling today to change the address on my account The street number seems off my a number *by"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. If they are trying to change address on the account, they must be able to provide their current address.
   - You only need the street address
   - For example, if they live at '7221 Florshim Drive, San Carlos, CA 91207', then you only need the part of '7221 Florshim Drive'
   - Enter this information into `record_reason`
3. Verify the identity of the customer.  They must provide 3 out of 7 of the items below which you you enter into `verify_identity`
   - Zip Code
   - Telephone Number
   - PIN Number
   - Username
   - Password
   - Email Address
   - Order ID of previous purchase
4. Ask for the new, desired value.
   - Again, you only need the street address > For example '7226 Florishim Drive'
   - Enter this info and select `update_account`
   - Tell them everything has been updated in the system

## Notes
- The customer wants to manage their address.
- Whether or not the conversation is successful depends on how happy you think the customer ended up. There is no right or wrong answer, just make your best judgement.


## Required actions (in order)
`pull_up_account` → `record_reason` → `verify_identity` → `update_account`


Wrap up by asking whether the customer needs anything else.
