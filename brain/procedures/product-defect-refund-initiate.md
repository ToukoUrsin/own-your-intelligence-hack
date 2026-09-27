---
title: "Procedure: Initiate Refund (Product Defect)"
type: procedure
intent: refund_initiate
flow: product_defect
---

# Initiate Refund (Product Defect)

Request type `refund_initiate` in the product defect family (refunds and returns).

Customers typically write:
- "i would like a refund. i changed my mind about the item no i simply changed my mind about it David Williams"
- "I need to request a refund. I sent back the boots I ordered because they just didn't go with my wardrobe. So I'd like a refund of the price. Crystal Minh"
- "Hi I have a question about an order I just placed I placed the order but I just realized I had already ordered it last month. I'd like to cancel it and get a refund Norman Bouchard"

## Steps

1. All chats in this flow start by asking the customer for their full name or Account ID using `pull_up_account`.  This will pull up their account in the background with the right information related to this user.
2. To confirm that their purchase is valid with `validate_purchase`:
   - Username - occasionally, the customer may not remember their username.  In this case, use the Recover Username subflow in the Account Access flow
   - Email Address
   - Order ID - last item, to be consistent with verify identity
3. Refund method in `record_reason` - valid options are
   - Gift card - they want a prepaid gift card, also ask for their address so you know where to mail it.  Enter this value in the next step.
   - Add value - to add value to their account.
   - Paper check - also ask for their address so you know where to mail the check.  Enter this address in the next step.
   - Credit card - direct refund to their credit card, assume a credit card is already on file.  To find it, you will need the account ID, which is entered in the next step.
4. Add in additional information using `enter_details`
   - If the customer chose gift card or paper check then enter the full address
   - If the customer chose add value or credit card then enter the account ID
5. Dollar amount - enter this value into the details form (without the dollar sign)
   - Then click `offer_refund`
   - If the customer does not know, the default amount is $50

## Notes
- Start by asking for the refund reason.  Then, to complete the refund, perform the following actions
- As always, wrap up by nicely asking if the customer needs any further assistance.


## Required actions (in order)
`pull_up_account` → `validate_purchase` → `record_reason` → `enter_details` → `offer_refund`


Wrap up by asking whether the customer needs anything else.
