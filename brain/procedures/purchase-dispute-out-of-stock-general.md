---
title: "Procedure: Out-of-Stock General (Purchase Dispute)"
type: procedure
intent: out_of_stock_general
flow: purchase_dispute
---

# Out-of-Stock General (Purchase Dispute)

Request type `out_of_stock_general` in the purchase dispute family (bad price, out of stock, promo codes, billing).

Customers typically write:
- "Hello, I am getting quite annoyed that when I go to purchase an item it is always out of stock items in general Albert Sanders"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Let the customer know that you will write up a report and let the Purchasing Department know about this, so they can do a better job.
   - Enter 'purchasing department' into the input box and `notify_team`
3. Check if the customer is satisfied
4. If they are still unhappy:
   - If the customer keeps pushing, offer them a discount using `promo_code`
   - You do not need to enter any information.
   - Generate the code and share that with them

## Notes
- The customer is calling in to call about items being out of stock
- Explain what you did in natural language.


## Required actions (in order)
`pull_up_account` → `notify_team` → `promo_code`


Wrap up by asking whether the customer needs anything else.
