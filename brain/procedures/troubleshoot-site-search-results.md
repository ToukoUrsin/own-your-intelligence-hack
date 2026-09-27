---
title: "Procedure: Search Not Working (Troubleshoot Site)"
type: procedure
intent: search_results
flow: troubleshoot_site
---

# Search Not Working (Troubleshoot Site)

Request type `search_results` in the troubleshoot site family (website slow, search not working, credit card, cart not updating).

Customers typically write:
- "I think you guys got the lines crossed on my searches because I can't find anything related to any of them"
- "Hi, first I'm sorry if I end up sounding annoyed but I've been on your site for about half an hour now and anytime I try to click or reload something I just get the buffer wheel"
- "Hi. I have been trying to search on your site but the search bar just doesn't seem to be working."

## Steps

1. Option 1
   - Instruct the customer to log out of their account and log back in.
   - Choose the `log_out_in` option as your action.  Nothing to enter in the form.
2. Option 2
   - Tell the customer to try clearing out their cookies.
   - If the customer asks how: Cookies can be reset by checking the settings option in the browser and selecting 'More Details'
   - Choose the `instructions` option as your action. Nothing to enter in the form.
3. Option 3
   - Let the customer know that you will write up a report and let the Website Team know about this, so they can do a better job.
   - Enter 'website team' into the input box and `notify_team`
4. Option 4
   - Ask the customer what their original search item is.
   - Have the customer search for a different product, such as 'Prada Handbag'.  If that search works, then try to search the original item again.
   - Choose the `try_again` option as your action.
5. Option 5 - Make the purchase for the customer.  To do this:
   - Start by asking for the customer’s credit card number
   - Then ask for the expiration date
   - Enter a phrase of brand and item, such as 'Gale Jeans' or 'Kline Shirt'
   - Then select `make_purchase`

## Notes
- The search results keep showing 'No results found' no matter what the customer searches for.  Shuffle up the order in which you choose these actions.
- Please do both (A) give instructions in your own words without copy/paste and (B) click the button in the right hand panel. If nothing works, just apologize and end the conversation.


## Required actions (in order)
`try_again` → `log_out_in` → `make_purchase` → `instructions` → `notify_team`


Wrap up by asking whether the customer needs anything else.
