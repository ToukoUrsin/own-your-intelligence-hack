---
title: "Procedure: Mistimed Billing Never Bought (Purchase Dispute)"
type: procedure
intent: mistimed_billing_never_bought
flow: purchase_dispute
---

# Mistimed Billing Never Bought (Purchase Dispute)

Request type `mistimed_billing_never_bought` in the purchase dispute family (bad price, out of stock, promo codes, billing).

Customers typically write:
- "Hi. I got billed for an order from you and I did not make the order! Hello?  This is kind of important! Alessandro Phoenix"
- "I am looking at my billing account and it looks like I was charged for a pair of Kline jeans that I did not order.  I want to see about getting that charge removed. I have an order ID That's 619474729"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. `validate_purchase` to confirm that they have a valid order:
   - Username - occasionally, the customer may not remember their username.  In this case, use the Recover Username subflow in the Account Access flow
   - Email Address
   - Order ID
3. To decide whether or not this is a valid error:
   - `check_system` if the customer made an error, which will return Yes or No
   - If the customer is right (Oracle says Yes), skip to the Update Order step below
4. If the customer is wrong (Oracle says No), then:
   - Ask the customer for their membership level and enter into `membership`
   - This only works for Gold members. > Even if the system says that this is a customer error, we value our Gold members really highly so we will just give them the credit anyway. > If it is already returned, then the company risks paying back the customer twice. > If the customer never bought the item, the company risks refunding the customer even though the customer was never charged in the first place.
   - For all other members > Unfortunately you cannot help them on this issue.  Do not update order.
5. If this is a company error or a Gold member, then start processing the credit.
   - Type in 'give credit' into the field
   - Then click on `update_order`

## Notes
- The customer has a problem on their bill because they never bought anything in the first place.
- Explain to the customer what you just did for them, and end the conversation.


## Required actions (in order)
`pull_up_account` → `validate_purchase` → `check_system` → `membership` → `update_order`


Wrap up by asking whether the customer needs anything else.
