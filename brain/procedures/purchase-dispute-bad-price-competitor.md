---
title: "Procedure: Bad Price Competitor (Purchase Dispute)"
type: procedure
intent: bad_price_competitor
flow: purchase_dispute
---

# Bad Price Competitor (Purchase Dispute)

Request type `bad_price_competitor` in the purchase dispute family (bad price, out of stock, promo codes, billing).

Customers typically write:
- "Hi. I see a pair of boots I really like on your website, but they are significantly more than other companies. Is this the best price you can offer? Account ID: 569PHQZO8I"
- "hi, the item i bought is overpaid compared to the competition. I would like to figure out why is there a price discrepancy? Alessandro Phoenix"

## Steps

1. All chats in this flow start by asking the customer for their full name or Account ID with `pull_up_account`.
   - This loads information in the background related to this user.
2. Find out why they are disputing a purchase price
   - Either 'competitor' or 'yesterday'
   - Enter this into the input box and `record_reason`
3. Check if this is a valid order by gathering the following info, then `verify_identity`
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
4. Try to convince the customer that sometimes the prices change, and that is outside of your control.
   - For example, Our pricing algorithms will often dynamically change the price of an item.
5. If they are still unhappy:
   - If the customer keeps pushing, offer them a discount using `promo_code`
   - You do not need to enter any information.
   - Generate the code and share that with them

## Notes
- The customer is calling in to call about a bad price.   The customer will give the reason the competitor has a better price.
- Wrap up as usual.


## Required actions (in order)
`pull_up_account` → `record_reason` → `verify_identity` → `promo_code`


Wrap up by asking whether the customer needs anything else.
