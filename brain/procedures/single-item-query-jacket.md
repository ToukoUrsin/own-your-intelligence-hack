---
title: "Procedure: Jacket FAQ (Single-Item Query)"
type: procedure
intent: jacket
flow: single_item_query
---

# Jacket FAQ (Single-Item Query)

Request type `jacket` in the single-item query family (FAQ questions about jeans, boots, shirt or sweater).

Customers typically write:
- "Hi I am thinking about buying a CK jacket. but I am not sure about it I am wondering, how to clean the jacket?"
- "Hello? Hi! I have a question about a product listed on your site I'm interested in buying a long jack from Mercer. The price is nice. But I'm not 100% sold on it"
- "Hi, I am interested in a jacket and would like a bit more detail. Can you help me?"

## Steps

1. When you realize that the customer is asking something that can be found in the FAQ, click the `search_kb` button
   - This will swap out for a different view that has FAQ content
   - If you made an error, just click `Hide FAQ` to switch back
2. Decide which article of clothing the customer is asking about:
   - Possible options are Jeans, Shirt, Boots and Jacket
   - Click the jacket toggle switch
   - This will record an action, so try to get this decision correct
   - The flow diagram allows you to see all the questions at once.
3. Read through the list of 8 options
   - Select the correct answer for the customer’s question with `search_kb`
   - Remember the question your selected for the survey later
4. The system created response does not include all the information, so make sure to explain the details in natural language.
   - Do not copy/paste.

## Notes
- The main effort is in figuring out which question the customer is asking:
- how to remove a wine stain, washer or dry-clean only, how long is the arm length, how do you detach the hood, shrink after washing, if the store has any in stock, what material is this made of, is this warm enough to wear


## Required actions (in order)
`search_kb` → `search-jacket` → `select-faq`


Answers are on the FAQ page `faq/jacket`.


Wrap up by asking whether the customer needs anything else.
