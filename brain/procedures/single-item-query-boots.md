---
title: "Procedure: Boots FAQ (Single-Item Query)"
type: procedure
intent: boots
flow: single_item_query
---

# Boots FAQ (Single-Item Query)

Request type `boots` in the single-item query family (FAQ questions about jeans, boots, shirt or sweater).

Customers typically write:
- "hello i'm hoping to get a little more info on some boots before i buy them i'm looking at the Mercer boots, the ones that are $64"
- "Hi I have a question about a product Norman Bouchard"
- "Hi, I'm wondering if it is possible to get gum off the sole of your shoes?"

## Steps

1. When you realize that the customer is asking something that can be found in the FAQ, click the `search_kb` button
   - This will swap out for a different view that has FAQ content
   - If you made an error, just click `Hide FAQ` to switch back
2. Decide which article of clothing the customer is asking about:
   - Possible options are Jeans, Shirt, Boots and Jacket
   - Click the boots toggle switch
   - This will record an action, so try to get this decision correct
   - The flow diagram allows you to see all the questions at once.
3. Read through the list of 8 options
   - Select the correct answer for the customer’s question with `search_kb`
   - Remember the question your selected for the survey later
4. The system created response does not include all the information, so make sure to explain the details in natural language.
   - Do not copy/paste.

## Notes
- The main effort is in figuring out which question the customer is asking
- how remove a paint stain, how wide is the shoe, how to remove gum, how long to wear in, waterproof, what is the lace color, desired size not in stock, comes with warranty


## Required actions (in order)
`search_kb` → `search-boots` → `select-faq`


Answers are on the FAQ page `faq/boots`.


Wrap up by asking whether the customer needs anything else.
