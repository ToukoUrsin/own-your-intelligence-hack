---
title: "Procedure: Status Mystery Fee (Order Issue)"
type: procedure
intent: status_mystery_fee
flow: order_issue
---

# Status Mystery Fee (Order Issue)

Request type `status_mystery_fee` in the order issue family (get status of an order or change an order, possibly shipping).

Customers typically write:
- "Hey can you check on an order for me. I found an extra fee added for no reason. Name: Rodriguez Domingo Account ID: 1MOI8FBNWM Order ID: 3795676317"
- "I think there's a billing problem. I see a fee that doesn't make sense to me. It looks that way to me."

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. To decide whether or not this is a valid error:
   - Check if the company made error by 'Asking the Oracle' which will return Yes or No
   - If this was a company mistake (Oracle says Yes), skip the next step
   - Make sure to explain the result in natural language.
4. If Oracle Says No, this means the customer possibly made an error
   - Ask the customer for their membership level and enter into `membership`
   - If Gold or Silver: > We trust our gold and silver members.  Thus, they will always get their extra fees removed.  Go to next step.
   - If Guest or Bronze: > Then this is a customer error, and the extra fee stays. You cannot do anything > Apologize for the issue and `End Conversation`
5. Offer to remove fee (only for Gold or Silver member)
   - Confirm the amount that the customer felt was overcharged
   - Enter this value (without dollar sign) and select `update_order`

## Notes
- The customer believes an extra charge has been added to their order.
- If the fee cannot be removed, then apologize to the customer.  Make up some reason why the price was high (i.e. there was a price surge at that time), and remember to mark the conversation as complete, but not successful in the survey.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `check_system` → `membership` → `update_order`


Wrap up by asking whether the customer needs anything else.
