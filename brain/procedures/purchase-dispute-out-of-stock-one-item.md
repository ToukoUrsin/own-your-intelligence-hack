---
title: "Procedure: Out-of-Stock One Item (Purchase Dispute)"
type: procedure
intent: out_of_stock_one_item
flow: purchase_dispute
---

# Out-of-Stock One Item (Purchase Dispute)

Request type `out_of_stock_one_item` in the purchase dispute family (bad price, out of stock, promo codes, billing).

Customers typically write:
- "Hi, I want to place an order, but the item I want is always out of stock Crystal Minh Silver member"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Find out which item they are unhappy about
   - Get the brand and type, such as 'Gap Sweater' or 'Uniqlo Socks'
   - Enter this into the input box and `record_reason`
3. Let the customer know that you will write up a report and let the Purchasing Department know about this, so they can do a better job.
   - Enter 'purchasing department' into the input box and `notify_team`
4. If the customer is still not satisfied with the outcome, then offer to make the order for the customer
   - Let the customer know that you can back-order the item for them.  The item will then ship immediately when it becomes available.
   - To proceed, enter the brand and item, such as 'Express Jeans' or 'Banana Republic Shirt' into the input box
   - Confirm that you should use the same credit card that is on file.
   - Lastly, select `make_purchase`

## Notes
- The customer is calling in to call about one particular item being out of stock.
- Let the customer know that their order will arrive soon, and try to make them happy.


## Required actions (in order)
`pull_up_account` → `record_reason` → `notify_team` → `make_purchase`


Wrap up by asking whether the customer needs anything else.
