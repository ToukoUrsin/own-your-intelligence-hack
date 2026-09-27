---
title: "Procedure: Return Due to Size (Product Defect)"
type: procedure
intent: return_size
flow: product_defect
---

# Return Due to Size (Product Defect)

Request type `return_size` in the product defect family (refunds and returns).

Customers typically write:
- "Hello. I need to return my order I got the wrong size by mistake. These jeans are way too big! Sure"
- "I bought the wrong size. I want to return it. Alessandro Phoenix"
- "Hi there I have an issue with my order They sent me the wrong size!"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Confirm that their purchase is valid with `validate_purchase`
   - Username - occasionally, the customer may not remember their username.  In this case, use the Recover Username subflow in the Account Access flow
   - Email Address
   - Order ID
3. Confirm their order can be returned, by checking their membership level.
   - Gold members: > Gold members get unlimited returns
   - Silver members: > Ask for the purchase date, return possible within the last 6 months <or> Ask if they have a receipt, get to return if user has receipt <or> Ask if in original packaging, get to return if in original packaging
   - Bronze members: > Ask for the purchase date, return possible within the last 90 days <or> Ask if they have a receipt, get to return if user has receipt <or> Ask if in original packaging, get to return if in original packaging
   - Guest members: > Ask for the purchase date, return possible within the last 30 days <or> Ask if they have a receipt, get to return if user has receipt
   - Enter the member level and then click the `membership` option
4. Communication
   - If the customer can return, tell them the good news and go to the next step
   - If the customer cannot return, apologize and explain the problem. Then `End Conversation`
5. Since the customer will print out a shipping label for the return, you need their full address.  You can give this explanation if the customer asks why you need the address.
   - Street Number and Street Name
   - City, State, Zip Code
   - Fill this as one line into `enter_details`
6. Ask the customer how they would like to process their return:
   - Options include: 'By Mail', 'In Store', or 'Drop off Center'
   - Fill in the form with one of these three values and submit to `update_order`

## Notes
- In all three cases for return, follow the same set of actions:
- As usual, end by asking if the customer needs any other assistance.


## Required actions (in order)
`pull_up_account` → `validate_purchase` → `membership` → `enter_details` → `update_order`


Wrap up by asking whether the customer needs anything else.
