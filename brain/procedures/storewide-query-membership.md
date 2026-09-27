---
title: "Procedure: Membership FAQ (Storewide Query)"
type: procedure
intent: membership
flow: storewide_query
---

# Membership FAQ (Storewide Query)

Request type `membership` in the storewide query family (FAQ questions about pricing, timing, membership or features).

Customers typically write:
- "hii i am looking for information to get premium membership i am planing to buy some more items also looking for membership options"
- "Hi there How long does premium membership last from when you get it?"
- "I’m good thank you I was interested in premium membership How do I become one"

## Steps

1. When you realize that the customer is asking something that can be found in the FAQ, click the `search_kb` button
   - This will swap out for a different view that has FAQ content
   - If you made an error, just click `Hide FAQ` to switch back
2. Decide which kind of question the customer is asking about:
   - Possible options are Pricing, Timing, Membership and Policies
   - Click the membership toggle switch
   - This will record an action, so try to get this decision correct.
   - The flow diagram allows you to see all the questions at once.
3. Read through the list of 4 options
   - Click `search_kb` for the correct answer to the customer’s question
   - Remember the category for the survey later
4. The automated system response does not include all the information, so make sure to explain the details in natural language.
   - You should not copy/paste

## Notes
- The main effort is in figuring out which question the customer is asking:
- What are all the membership levels?, How does a customer qualify for premium membership?, What are some of the benefits of membership?, How long does membership last?


## Required actions (in order)
`search_kb` → `search-membership` → `select-faq`


Answers are on the FAQ page `faq/membership`.


Wrap up by asking whether the customer needs anything else.
