---
title: "Procedure: Jeans FAQ (Single-Item Query)"
type: procedure
intent: jeans
flow: single_item_query
---

# Jeans FAQ (Single-Item Query)

Request type `jeans` in the single-item query family (FAQ questions about jeans, boots, shirt or sweater).

Customers typically write:
- "What is the brand of the product? shirt ok"
- "hi I want to have more information about an item I want to get a jean"
- "Hi I just got Kline jeans How often do these need washed Joseph Banter"

## Steps

1. When you realize that the customer is asking something that can be found in the FAQ, click the `search_kb` button
   - This will swap out for a different view that has FAQ content
   - If you made an error, just click `Hide FAQ` to switch back
2. Decide which article of clothing the customer is asking about:
   - Possible options are Jeans, Shirt, Boots and Jacket
   - Click the jeans toggle switch
   - This will record an action, so try to get this decision correct
   - The flow diagram allows you to see all the questions at once.
3. Read through the list of 8 options
   - Select the correct answer for the customer’s question with `search_kb`
   - Remember the question your selected for the survey later
4. The system created response does not include all the information, so make sure to explain the details in natural language.
   - Do not copy/paste.

## Notes
- The main effort is in figuring out which question the customer is asking:
- how to remove a grass stain, how often does this need to be washed, how long is the leg length, cost to get it tailored, shrink after washing, dark blue or black color, any in a larger/smaller size, design with ripped holes in them


## Required actions (in order)
`search_kb` → `search-jeans` → `select-faq`


Answers are on the FAQ page `faq/jeans`.


Wrap up by asking whether the customer needs anything else.
