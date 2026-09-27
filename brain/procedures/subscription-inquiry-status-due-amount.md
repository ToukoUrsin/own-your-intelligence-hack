---
title: "Procedure: Status Due Amount (Subscription Inquiry)"
type: procedure
intent: status_due_amount
flow: subscription_inquiry
---

# Status Due Amount (Subscription Inquiry)

Request type `status_due_amount` in the subscription inquiry family (billing and updates of the premium subscription service).

Customers typically write:
- "HI! quick question. I signed up for the subscription service and I want to know if the payment is due.. David Williams"
- "Hi! I'm so excited I just became a member! I want to pay the remaining balance on my subscription and activate it. Can you tell me how much is due?"
- "Hi there! I'm bit confused about my subscription I really don't know about the status of my subscription - do I have it or not have it?"

## Steps

1. All chats in this flow start by asking the customer for their full name or Account ID with `pull_up_account`.
   - This loads information in the background related to this user.
2. Start by looking up the order using the `verify_identity` fields.
   - Full name - may have gotten this earlier
   - Account ID - may have gotten this earlier
   - Order ID
3. Find out the status by using `subscription_status` action
   - You do not need to enter anything into the form. Just click the button.
   - This will return the general results, including whether or not the subscription is active or cancelled, as well as the due amount and the due date.
   - If the status does not make sense (ie. bill due today but amount due of $0), feel free to adjust the values (i.e make it $20 instead) so the story is reasonable.
   - You should then translate this into natural language to explain the details.
4. Provide a link to their account so they can look this up themselves in the future.
   - This is accomplished with the `send_link` button.  You can put 'account login' as the text.  Explain that this is the link for signing into their account.
   - Make sure they know their own username.  Provide it to them if they don’t.  You can make up their username as the first letter of first name + last name + 1 > For example: Howard Chen → hchen1
5. Optional Step
   - Especially if the subscription is not active or past due, the customer will want to pay the bill.  In this case, get the amount and input into `enter_details`.

## Notes
- The customer wants to know the amount due for their subscription.
- Be sure to be courteous and ask if they need anything else before ending the conversation.


## Required actions (in order)
`pull_up_account` → `verify_identity` → `subscription_status` → `send_link` → `enter_details`


Wrap up by asking whether the customer needs anything else.
