---
title: "Procedure: Cart Not Updating (Troubleshoot Site)"
type: procedure
intent: shopping_cart
flow: troubleshoot_site
---

# Cart Not Updating (Troubleshoot Site)

Request type `shopping_cart` in the troubleshoot site family (website slow, search not working, credit card, cart not updating).

Customers typically write:
- "Hi, I want to buy something but my shopping cart on the site isn't updating? Hello? What should I do?"
- "Hey I'm trying to buy something, but for some odd reason my cart isn't updating. It keeps saying it's empty. What gives? Ok fantastic Joyce Wu"
- "Hi I'm having a problem adding things to my cart. can you help?"

## Steps

1. Option 1
   - Instruct the customer to refresh the page and add the item again.
   - Choose the `try_again` option as your action. Nothing to enter in the form.
2. Option 2
   - Instruct the customer to log out of their account and log back in.
   - Choose the `log_out_in` option as your action.  Nothing to enter in the form.
3. Option 3
   - Have the customer check whether the selected item is Out-of-Stock.  This will be listed on the bottom left-hand side of the product page.
   - Enter 'troubleshoot' into the form and choose the `enter_details` option as your action.
4. Option 4 - Make the purchase for the customer.  To do this:
   - Start by asking for the customer’s credit card number
   - Then ask for the expiration date
   - Enter a phrase of brand and item, such as 'Gale Jeans' or 'Kline Shirt'
   - Then select `make_purchase`

## Notes
- The customer is trying to place an item in their shopping cart, but the cart is not updating.  Choose actions in any order you want.
- Please do both (A) give instructions in your own words without copy/paste and (B) click the button in the right hand panel. If nothing works, just apologize and end the conversation.


## Required actions (in order)
`try_again` → `log_out_in` → `enter_details` → `make_purchase`


Wrap up by asking whether the customer needs anything else.
