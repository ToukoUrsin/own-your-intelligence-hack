---
title: "Procedure: Recover Password (Account Access)"
type: procedure
intent: recover_password
flow: account_access
---

# Recover Password (Account Access)

Request type `recover_password` in the account access family (username, password, and two-factor authentication).

Customers typically write:
- "Hello, I am having trouble accessing my account because I forgot my password Sanya Afzal"
- "Hi, I'm trying to get into my account and can't remember my password.  Can you help? David Williams Username is DavyW24"
- "I forgot my password - now can't access my acc I need to check my order status yes please"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Get the customer’s username to check their identity
   - If they don’t have their username, then follow the 'Recover Username' flow above
   - Once you have it, enter the username and click on `enter_details`
3. Tell the customer you cannot get their password, but you can generate a new one for them.
4. To operate the `make_password` action, you will first need:
   - Pin Number <or> answer to the Security Question
   - Enter either value into the box and then click the `make_password` button

## Notes
- Help the customer get a new password
- Share the password with the customer.


## Required actions (in order)
`pull_up_account` → `enter_details` → `make_password`


Wrap up by asking whether the customer needs anything else.
