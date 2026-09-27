---
title: "Procedure: Status Credit Missing (Manage Account)"
type: procedure
intent: status_credit_missing
flow: manage_account
---

# Status Credit Missing (Manage Account)

Request type `status_credit_missing` in the manage account family (subscription service added or removed, change profile info).

Customers typically write:
- "Hi I think I am missing about $40 in credits on my account. Name: Norman Bouchard The question regards a Harbor jacket I bought that costs $59"
- "I think i have some missing credit worth $40 on my account ok Norman Bouchard"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Find out where the credits originated from.  Apologize for any inconvenience.
   - Options include `'subscription refund', 'previous purchase', 'promotional package'`
   - Enter this into the input box and `record_reason`
3. To decide whether or not this is a valid error:
   - Check if missing credit is accurate by 'Asking the Oracle' which will return Yes or No
   - Make sure to explain the result in natural language.
4. If the credit is not missing (Oracle returns No) , then it is a problem in the Customer Interface
   - Please tell them to log out and log back in again, or something similar.
   - Assure the customer that their credit shows up on your side.
   - Feel free to end the conversation.
5.  If the credit is missing (Oracle returns Yes):
   - Ask for how much credit to add to the customer’s account.  If the customer does not know, the standard amount is $40.
   - Enter in the amount and click `promo_code`
   - Send the generated promo code to the customer.

## Notes
- Some credit is missing from the customer’s account.
- Whether or not the conversation is successful depends on how happy you think the customer ended up. There is no right or wrong answer, just make your best judgement.  If nothing works, just apologize and end the conversation.


## Required actions (in order)
`pull_up_account` → `record_reason` → `check_system` → `promo_code`


Wrap up by asking whether the customer needs anything else.
