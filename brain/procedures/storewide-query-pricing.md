---
title: "Procedure: Pricing FAQ (Storewide Query)"
type: procedure
intent: pricing
flow: storewide_query
---

# Pricing FAQ (Storewide Query)

Request type `pricing` in the storewide query family (FAQ questions about pricing, timing, membership or features).

Customers typically write:
- "Can you tell me the price for overnight shipping?  Is it even available?"
- "Hello. I have some stuff in my shopping cart and I want to know if I can get it shipped for free."
- "good morning, I'm thinking of buying something but I want to know if I qualify for free shipping thanks"

## Steps

1. When you realize that the customer is asking something that can be found in the FAQ, click the `search_kb` button
   - This will swap out for a different view that has FAQ content
   - If you made an error, just click `Hide FAQ` to switch back
2. Decide which kind of question the customer is asking about:
   - Possible options are Pricing, Timing, Membership and Policies
   - Click the pricing toggle switch
   - This will record an action, so try to get this decision correct.
   - The flow diagram allows you to see all the questions at once.
3. Read through the list of 4 options
   - Click `search_kb` for the correct answer to the customer’s question
   - Remember the category for the survey later
4. The automated system response does not include all the information, so make sure to explain the details in natural language.
   - You should not copy/paste

## Notes
- The main effort is in figuring out which question the customer is asking:
- Price of gift wrapping, Price of stitching your name, Price of overnight shipping, Does shopping cart qualify for free shipping


## Required actions (in order)
`search_kb` → `search-pricing` → `select-faq`


Answers are on the FAQ page `faq/pricing`.


Wrap up by asking whether the customer needs anything else.
