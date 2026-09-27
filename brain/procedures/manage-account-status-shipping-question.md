---
title: "Procedure: Status Shipping Question (Manage Account)"
type: procedure
intent: status_shipping_question
flow: manage_account
---

# Status Shipping Question (Manage Account)

Request type `status_shipping_question` in the manage account family (subscription service added or removed, change profile info).

Customers typically write:
- "Hi, I have a shipping question I want to know if my account includes free shipping from out of country"
- "Hi, I would like to check the status of my account because I have a question about shipping. I need to know if I order something from out of the country if I will get free shipping on that? My name is Joyce Wu."

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. To decide whether or not this is a valid error:
3. x

## Notes
- Customer has a question about their account.  Namely, they want to know if the account allows them free shipping to/ from out of the country. This might be also phrased as international shipping.
- If you would like, you can message the customer with 'www.AcmeBrands.com/faq/subscription' as the fake link.  Remember to end the conversation by asking if they need anything else.


## Required actions (in order)
`pull_up_account` → `check_system` → `send_link`


Wrap up by asking whether the customer needs anything else.
