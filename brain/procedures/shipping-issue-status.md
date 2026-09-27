---
title: "Procedure: Shipping Status (Shipping Issue)"
type: procedure
intent: status
flow: shipping_issue
---

# Shipping Status (Shipping Issue)

Request type `status` in the shipping issue family (check our update a shipment of an item).

Customers typically write:
- "I’m good thank you! Can you check  my order. Am I getting Gale boots?g Is the Gale boots being delivered to my house"
- "Hi! I received an email saying that my shipping date was wrong.  I need to confirm my shipping date and make sure nothing is wrong David Williams"
- "Hello, I would like to confirm my shipping address It seems to be different from what was in my order My name is Rodriguez Domingo"

## Steps

1. All chats in this flow start by asking the customer for their full name or Account ID with `pull_up_account`.
   - This loads information in the background related to this user.
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. To confirm that their purchase is valid with `validate_purchase`:
   - Username - occasionally, the customer may not remember their username.  In this case, use the Recover Username subflow in the Account Access flow
   - Email Address
   - Order ID
4. Ask the Oracle
   - The customer will ask some sort of of yes/no question, which you can query the Oracle to get the answer
   - Explain the answer in natural language, and feel free to add any creative explanations or background.
5. If the Oracle says Yes, then you can confirm that the customer’s order looks as expected and the email was incorrect
6. If the Oracle says No, then the customer will not be happy. To resolve, enter how you will fix the problem
   - Options include: 'change date', 'change address', 'change item', or 'change price'
   - Enter into `update_order`

## Notes
- The customer wants to check up on the status of their shipment because they received an email notification that seems to imply something wrong. The customer will ask some sort of yes/no question in these scenarios, which you will answer.
- Explain what you did and ask if they need anything else.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `validate_purchase` → `check_system` → `update_order`


Wrap up by asking whether the customer needs anything else.
