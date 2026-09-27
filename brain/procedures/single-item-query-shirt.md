---
title: "Procedure: Shirt FAQ (Single-Item Query)"
type: procedure
intent: shirt
flow: single_item_query
---

# Shirt FAQ (Single-Item Query)

Request type `shirt` in the single-item query family (FAQ questions about jeans, boots, shirt or sweater).

Customers typically write:
- "Hi can i get some product info I want to know about Shirt - Guess"
- "I was curious if a shirt would shrink after watching it was made by Harbor"

## Steps

1. When you realize that the customer is asking something that can be found in the FAQ, click the `search_kb` button
   - This will swap out for a different view that has FAQ content
   - If you made an error, just click `Hide FAQ` to switch back
2. Decide which article of clothing the customer is asking about:
   - Possible options are Jeans, Shirt, Boots and Jacket
   - Click the shirt toggle switch
   - This will record an action, so try to get this decision correct
   - The flow diagram allows you to see all the questions at once.
3. Read through the list of 8 options
   - Select the correct answer for the customer’s question with `search_kb`
   - Remember the question your selected for the survey later
4. The system created response does not include all the information, so make sure to explain the details in natural language.
   - Do not copy/paste.

## Notes
- The main effort is in figuring out which question the customer is asking:
- remove a stain from the shirt, how to wash the shirt, how long is the arm length, how wide is the collar, does this shirt shrink, has any small/medium/large in stock, buttons in brown or black, what material the shirt is made of


## Required actions (in order)
`search_kb` → `search-shirt` → `select-faq`


Answers are on the FAQ page `faq/shirt`.


Wrap up by asking whether the customer needs anything else.
