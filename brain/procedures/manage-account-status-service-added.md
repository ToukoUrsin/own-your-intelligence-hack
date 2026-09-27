---
title: "Procedure: Status Service Added (Manage Account)"
type: procedure
intent: status_service_added
flow: manage_account
---

# Status Service Added (Manage Account)

Request type `status_service_added` in the manage account family (subscription service added or removed, change profile info).

Customers typically write:
- "Hi I see in my email I was charged for subscription I do not want Alessandro Phoenix"
- "Hi! I need to check my account.  I got an email saying a subscription was added to my account and I do not want that Joseph Banter"

## Steps

1. Ask the customer for their Full name or Account ID with `pull_up_account`.  This loads information in the background with information related to this user.
2. Find out how the customer heard about this issue:
   - Options are one of the three `'email', 'spouse', 'news'`
   - Enter this into the input box and `record_reason`
3. To decide whether or not this is a valid error:
   - Tell the customer you will check your system about this problem.
   - You do not have to enter anything into the field.
   - Then `check_system` if the customer made an error, which will return Yes or No
4. If the customer is mistaken (Oracle says No), then explain:
   - If the customer was sent an email > Let them know this was a scam email, and if they check the sender, it isn’t from the official AcmeCorp marketing team.
   - If the customer was told this from their spouse > let them know they must have misheard.  They have nothing to worry about and there are no extra charges.
   - If the customer saw this in the news > then let them know nicely that they must have misunderstood.   They have nothing to worry about and there are no extra charges.
5. If the customer is correct (Oracle says Yes), then remove the extra service
   - Enter in 'remove service' and use the `update_account` button.
   - Tell the customer that the extra service has been removed.
6. If it is a legitimate error, then you can offer a refund to the customer
   - The amount should be for $40
   - Enter '40' in the field and then click on `offer_refund`

## Notes
- The customer believes that an unknown service was added to their account.
- If nothing works, just apologize and end the conversation.


## Required actions (in order)
`pull_up_account` → `record_reason` → `check_system` → `update_account` → `offer_refund`


Wrap up by asking whether the customer needs anything else.
