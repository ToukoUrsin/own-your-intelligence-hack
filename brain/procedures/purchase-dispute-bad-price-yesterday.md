---
title: "Procedure: Bad Price Yesterday (Purchase Dispute)"
type: procedure
intent: bad_price_yesterday
flow: purchase_dispute
---

# Bad Price Yesterday (Purchase Dispute)

Request type `bad_price_yesterday` in the purchase dispute family (bad price, out of stock, promo codes, billing).

Customers typically write:
- "Hi I saw an item on sale yesterday but I didnt have the money to buy it and today it is not on sale :("
- "hi! I was calling to resolve a problem I have.. I was trying to buy an item but when i checked this morning the price was much higher than it was yesterday"
- "I'm looking at a jacket that I want to purchase but it was much cheaper yesterday David Williams"

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
- The customer is calling in to call about a bad price.   The customer will give the reason yesterday’s price was lower.
- Wrap up as usual.


## Required actions (in order)
`pull_up_account` → `record_reason` → `verify_identity` → `promo_code`


Wrap up by asking whether the customer needs anything else.
