---
title: "Procedure: Recover Username (Account Access)"
type: procedure
intent: recover_username
flow: account_access
---

# Recover Username (Account Access)

Request type `recover_username` in the account access family (username, password, and two-factor authentication).

Customers typically write:
- "I forgot my username. Now can't access my acc. Alessandro Phoenix, and zip code is 47749, email: jkkljlkj@example.com"
- "Hi there, I'm trying to get in to my account but I forgot my username. I had it on a piece of paper but I think my dog ate it. :( Alessandro Phoenix"
- "I forgot my username and need to check an order Albert Sanders,38309,as260324@example.com"

## Steps

1. Ask the customer for their Full name or Account ID with `pull_up_account`.   This loads information in the background related to this user.
2. Ask the customer for 3 out of 4 items below and use the `verify_identity` button
   - Full name - first and last
   - Zip Code
   - Phone number
   - Email Address
3. You make up their username with the first letter of their first name, their last name with a 1
   - For example: John Smith → jsmith1
   - For example: Wendy Chesterfield → wchesterfield1
   - If you are here as part of `validate_purchase` action or some external flow assume this new username is correct even if the system says it is not valid, and just continue forward with the conversation

## Notes
- To get their username, you must
- That’s it. This flow is very short and often occurs in conjunction with other flows.


## Required actions (in order)
`pull_up_account` → `verify_identity`


Wrap up by asking whether the customer needs anything else.
