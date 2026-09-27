---
title: "Procedure: Manage Extension (Subscription Inquiry)"
type: procedure
intent: manage_extension
flow: subscription_inquiry
---

# Manage Extension (Subscription Inquiry)

Request type `manage_extension` in the subscription inquiry family (billing and updates of the premium subscription service).

Customers typically write:
- "I signed up for a premium subscription but I need a little more time to come up with the money Joseph Banter"
- "Hello Can you please give me some more time to pay for my subscription? I don't have the money right now because my covid stimulus check hasn't arrived yet."

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. Whether or not they get an extension depends on the membership level
   - Enter the member level (Gold, Silver, Bronze or Guest) into `membership`
   - Gold members can always get an extension
   - Silver member get an extension if they are only 1 day late
   - Bronze and Guest members cannot get an extension > For these, apologize that you cannot do anything for them.
4. (Option A) If they get an extension
   - Enter 'extend subscription' into `update_account`
   - Then ask if they need anything else and wrap up the conversation
5. (Option B) If they do not get an extension and escalate to the manager
   - Ask for their phone number so they have a number you can call them on
   - Put the phone number into `enter_details`
   - Then let them know, the manager will call them back later
   - Enter 'manager' into the `notify_team` action
   - Finally, ask if they need anything else and end the conversation

## Notes
- Customer cannot pay for their premium subscription and wants to ask for an extension.
- Wrap up as usual.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `membership` → `update_account` → `enter_details`


Wrap up by asking whether the customer needs anything else.
