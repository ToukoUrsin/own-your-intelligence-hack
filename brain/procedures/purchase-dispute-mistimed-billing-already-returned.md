---
title: "Procedure: Mistimed Billing Already Returned (Purchase Dispute)"
type: procedure
intent: mistimed_billing_already_returned
flow: purchase_dispute
---

# Mistimed Billing Already Returned (Purchase Dispute)

Request type `mistimed_billing_already_returned` in the purchase dispute family (bad price, out of stock, promo codes, billing).

Customers typically write:
- "I have a question about my account I returned these boots I bought awhile ago but I don't see a refund on my account. my name is Chloe Zhang"
- "I am LIVID, I tell you. LIVID! My name is Albert Sanders. I completed a return, but your incompetent company has yet to reverse the charge. THE NERVE!"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. `validate_purchase` to confirm that they have a valid order:
   - Username - occasionally, the customer may not remember their username.  In this case, use the Recover Username subflow in the Account Access flow
   - Email Address
   - Order ID
3. Decide whether or not this is a valid error by checking the time frame.
   - Ask how long the customer has waited for the refund to show up, in days
   - Enter this amount in `record_reason`
   - If the customer is right (more than 7 days), skip to the Update Order step below
4. If it has not been long enough (less than 7 days), then:
   - Ask the customer for their membership level and enter into `membership`
   - This only works for Gold members. > The company risks paying back the customer twice by issuing two refunds, but we do this anyway because we really value our Gold Members.
   - For all other members > Unfortunately you cannot help them on this issue.  Do not update order.
5. If this is a company error or a Gold member, then start processing the credit.
   - Type in 'give credit' into the field
   - Then click on `update_order`

## Notes
- The customer believes they have a problem on their bill.  They have already returned their item but have not received their credit.  If they want a refund, consider “Product Defect > Initiate Refund” instead.
- Explain to the customer what you just did for them, and end the conversation.


## Required actions (in order)
`pull_up_account` → `validate_purchase` → `record_reason` → `membership` → `update_order`


Wrap up by asking whether the customer needs anything else.
