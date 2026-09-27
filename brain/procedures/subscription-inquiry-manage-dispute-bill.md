---
title: "Procedure: Manage Dispute Bill (Subscription Inquiry)"
type: procedure
intent: manage_dispute_bill
flow: subscription_inquiry
---

# Manage Dispute Bill (Subscription Inquiry)

Request type `manage_dispute_bill` in the subscription inquiry family (billing and updates of the premium subscription service).

Customers typically write:
- "Hi, I just checked my statement and you have charged me twice for the subscription service, twice in the same month. Thank you. Albert Sanders"
- "Hello I have an issue that I need assistance with. I am disputing my bill because I was charged twice for an item I purchased."

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. Whether or not they get an refund depends on the membership level
   - Enter the member level (Gold, Silver, Bronze or Guest) into `membership`
   - Gold members can always get what they want 
   - Silver member get a refund if the amount wrong is less than $10
   - Bronze and Guest members depend on checking the system (see next step)
4. If Bronze or Guest members, you need to `check_system`
   - If the Oracle says Yes, then they still get the refund
   - If the Oracle says No, then the customer does not get the refund
5. Find out how much the customer is asking for
   - If they are supposed to be charged $50 and the bill was $60, then the refund amount should be $10
   - Perhaps they are just complaining because the bill was high, but they haven’t actually paid it yet.  In this case, just apologize for the misunderstanding.
   - However, perhaps they already paid the bill.  In this case, enter the correct amount (for example '10') and select `offer_refund`

## Notes
- The customer thinks something is wrong with their subscription bill, such that they were billed twice.
- Act politely and ask if they need anything else before ending the conversation.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `membership` → `check_system` → `offer_refund`


Wrap up by asking whether the customer needs anything else.
