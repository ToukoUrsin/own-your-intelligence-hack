---
title: "Procedure: Promo Code Out of Date (Purchase Dispute)"
type: procedure
intent: promo_code_out_of_date
flow: purchase_dispute
---

# Promo Code Out of Date (Purchase Dispute)

Request type `promo_code_out_of_date` in the purchase dispute family (bad price, out of stock, promo codes, billing).

Customers typically write:
- "hi ive got a promo code but its showing as invalid Rodriguez Domingo"
- "Hi, my name is Chloe and the promo code that I am using is not working even though I got the code 2 days ago Okay, great. I would like to get this situated I am not a member, I am a guest. I can tell you my order ID"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Typically promotions only last 7 days so check if the code was issued a long time ago.   That might be the reason it doesn’t work.
   - If the promo code is more than 7 days, then the correct subflow is 'out of date', otherwise, the correct subflow is 'invalid'
   - Both flows follow the same instructions below.
3. To decide whether or not this is a valid error:
   - Tell the customer you will check your system about this problem.
   - Then `check_system` if the customer made an error, which will return Yes or No
   - Make sure to explain the result in natural language.
   - If the customer is right (Oracle says Yes), skip to the Promo Code step below
4. If the customer is wrong (Oracle says No), then:
   - Ask the customer for their membership level.
   - Enter the member level (even if just a Guest) into `membership` and submit.
   - Gold, Silver and Bronze all qualify. > The idea here is that even if their promo code is not valid for whatever reason, we will generate a new one for them because they are a valued member.
   - Guest > If they are just a regular user, then apologize that you cannot help them because there is nothing you can do
5. Generate the promo code and share that with them
   - No need to enter anything into the form.
   - Click on `promo_code`
   - If the customer asks, you can say it is for 20% off their next purchase.

## Notes
- The customer is complaining about a promo code that is considered out-of-date.  Keep this reason in mind later for filling out the survey.
- Explain what you did in natural language.


## Required actions (in order)
`pull_up_account` → `check_system` → `membership` → `promo_code`


Wrap up by asking whether the customer needs anything else.
