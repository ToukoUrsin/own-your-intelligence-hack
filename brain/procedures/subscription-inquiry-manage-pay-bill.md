---
title: "Procedure: Manage Pay Bill (Subscription Inquiry)"
type: procedure
intent: manage_pay_bill
flow: subscription_inquiry
---

# Manage Pay Bill (Subscription Inquiry)

Request type `manage_pay_bill` in the subscription inquiry family (billing and updates of the premium subscription service).

Customers typically write:
- "Hi there, I have subscribed to the premium subscription shopping service and want to pay the subscription fee because I would like to keep it active. My name is Albert Sanders"
- "Hi! I have this subscription shopping service and wanted to make sure that it is still active David Williams"
- "I wanna pay my subscription fee cause I wanna keep the annual subscription active Yes 3TJIVRSUAV"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. The standard subscription is $99 a year.  Find out how much of this the customer wants to pay.
   - If the customer does not know the amount, you can click go to KB Query > `subscription_status` to generate a random amount due.  Explain to the customer that this is what they need to pay.
   - If this value is $0, make it $99 instead so it makes sense.
   - Once you have a number enter that value into `enter_details`
4. Ask if the customer has a credit card number.  If they do not, tell them you will use the credit card on the account
5. Finalize their subscription payment
   - Enter the value of 'renew subscription'
   - Click the `update_account` button

## Notes
- Customer wants to pay or renew their subscription
- Act politely and ask if they need anything else before ending the conversation.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `subscription_status` → `enter_details` → `update_account`


Wrap up by asking whether the customer needs anything else.
