---
title: "Procedure: Website Too Slow (Troubleshoot Site)"
type: procedure
intent: slow_speed
flow: troubleshoot_site
---

# Website Too Slow (Troubleshoot Site)

Request type `slow_speed` in the troubleshoot site family (website slow, search not working, credit card, cart not updating).

Customers typically write:
- "Hello. I have an issue with your site This is the problem. I went to purchase something but I was not able to do it The website is moving like a snail!"
- "Hi. I'm trying to use your website but it is moving so slowly!"

## Steps

1. Option 1
   - Let the customer know that you will write up a report about the slow speeds for the Website Team to fix.
   - Enter 'website team' into the input box and `notify_team`
2. Option 2
   - Instruct the customer to log out of their account and log back in.
   - Choose the `log_out_in` option as your action.  Nothing to enter in the form.
3. Option 3
   - Tell the customer to try visiting another website first.
   - If all websites are slow, then it is the customer’s internet connection and not a problem with the AcmeCorp website.
   - Choose the `try_again` option as your action. Nothing to enter in the form.
4. Option 4
   - Ask the customer to close all the other tabs on their browser. Also instruct them to close other programs that may be running.
   - Explain that many programs running in the background can cause a slowdown.
   - Choose the `instructions` option as your action.
5. Option 5 - Make the purchase for the customer.  To do this:
   - Start by asking for the customer’s credit card number
   - Then ask for the expiration date
   - Enter a phrase of brand and item, such as 'Gale Jeans' or 'Kline Shirt'
   - Then select `make_purchase`

## Notes
- The acmecorp.com website has slowed down to a crawl, making it unusable.  Pick these actions in any order you wish.  Feel free to be creative.
- Please do both (A) give instructions in your own words without copy/paste and (B) click the button in the right hand panel. If nothing works, just apologize and end the conversation.


## Required actions (in order)
`try_again` → `log_out_in` → `make_purchase` → `instructions` → `notify_team`


Wrap up by asking whether the customer needs anything else.
