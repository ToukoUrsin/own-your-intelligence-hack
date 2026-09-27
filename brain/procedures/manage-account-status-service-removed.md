---
title: "Procedure: Status Service Removed (Manage Account)"
type: procedure
intent: status_service_removed
flow: manage_account
---

# Status Service Removed (Manage Account)

Request type `status_service_removed` in the manage account family (subscription service added or removed, change profile info).

Customers typically write:
- "I just want to make sure the premium subscription is still on my account.  i am not seeing the information when I log in David Williams"
- "I want to check the status of my subscription Joseph Banter"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. Find out how the customer heard about this issue:
   - Options are one of the three `'email', 'spouse', 'news'`
   - Enter this into the input box and `record_reason`
3. To decide whether or not this is a valid error:
   - Tell the customer you will check your system about this problem.
   - Then `check_system` if the customer is right, which will return Yes or No
4. If the customer is mistaken (Oracle says No), then explain that there was a mistake:
   - If the customer was sent an email > Let them know this was a scam email, and if they check the sender, it isn’t from the official AcmeCorp marketing team.
   - If the customer was told this from their spouse > let them know they must have misheard.  They have nothing to worry about and there are no extra charges.
   - If the customer saw this in the news > then let them know nicely that they must have misunderstood.   They have nothing to worry about and there are no extra charges.
5. If the customer is correct (Oracle says Yes), then reinstate the lost service
   - Enter in 'add service' and click the `update_account` button.
   - Explain to the customer that their service has been reinstated.
6. Check that the service is now operational.  (i.e. 'Can you see the service properly activated on your account now?')
   - If they say yes, then wonderful! You are done.
   - If they say no, then tell them it may take a few minutes.  Then proceed to ask if they need anything else.

## Notes
- The customer believes that an important service was mistakenly removed from their plan.
- Remember to always end the conversations by asking if they need anything else.  If nothing works, just apologize and end the conversation.


## Required actions (in order)
`pull_up_account` → `record_reason` → `check_system` → `update_account`


Wrap up by asking whether the customer needs anything else.
