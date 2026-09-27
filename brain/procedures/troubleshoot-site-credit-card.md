---
title: "Procedure: Invalid Credit Card (Troubleshoot Site)"
type: procedure
intent: credit_card
flow: troubleshoot_site
---

# Invalid Credit Card (Troubleshoot Site)

Request type `credit_card` in the troubleshoot site family (website slow, search not working, credit card, cart not updating).

Customers typically write:
- "Hi, I'm trying to buy something but my card keeps getting some rejection error. Okay, great. I need to buy stuff as soon as possible."
- "I am trying to make a purchase on the site and it keeps saying my card is rejected thanks"
- "My credit keeps getting rejected Trying to buy woman's boots"

## Steps

1. Option 1
   - Instruct the customer to try entering their credit card information again
   - Choose the `try_again` option as your action. Nothing to enter in the form.
2. Option 2
   - Instruct the customer to log out of their account and log back in.
   - Choose the `log_out_in` option as your action.  Nothing to enter in the form.
3. Option 3
   - Have the customer check the expiration date, maybe the credit card is too old
   - Enter 'troubleshoot' into the form and choose the `enter_details` option as your action.
4. Option 4 - Make the purchase for the customer.  To do this:
   - Start by asking for the customer’s credit card number
   - Then ask for the expiration date
   - Enter a phrase of brand and item, such as 'Gale Jeans' or 'Kline Shirt'
   - Then select `make_purchase`

## Notes
- Customer’s credit card keeps getting rejected and is considered invalid.  Choose these in any order.
- Please do both (A) give instructions in your own words without copy/paste and (B) click the button in the right hand panel.  If nothing works, just apologize and end the conversation.


## Required actions (in order)
`try_again` → `log_out_in` → `enter_details` → `make_purchase`


Wrap up by asking whether the customer needs anything else.
