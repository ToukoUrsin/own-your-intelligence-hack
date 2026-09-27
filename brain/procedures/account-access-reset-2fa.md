---
title: "Procedure: Reset Two-Factor Auth (Account Access)"
type: procedure
intent: reset_2fa
flow: account_access
---

# Reset Two-Factor Auth (Account Access)

Request type `reset_2fa` in the account access family (username, password, and two-factor authentication).

Customers typically write:
- "I can't access my account because I lost my phone with the 2 factor authentication on it I needed to see my shopping history Thanks"
- "I want to remove the phone tied to my account, I have lost the phone. Joseph Banter"
- "I was going to check up on my order but I have lost my phone that I was using for my two factor authentication How can I get back into my account? yes"

## Steps

1. Get Full Name or Account ID for `pull_up_account`
2. You will need their email address so you can email them the reset code:
   - Enter their email address with the `enter_details` action
   - If they don’t have their email address, you can bypass this problem by getting one of the following two items: > Ask for their PIN number > Tell them you are going to ask the security question, which is 'What is your mother’s maiden name?'
   - Then submit that value into the `enter_details` form instead.  Tell them that you will send the reset code to the email address saved on file.  Feel free to make up an email address if the customer asks for it.
3. Inform the customer that to be safe, they should also follow best practices for security.
   - Tell them you will send a link about security best practices
   - Then click the `send_link` button, you do not need to enter anything into the form

## Notes
- Let the customer know that to reset, you will be sending a special code to their email.  To proceed:
- If the customer does not seem satisfied, then mark the conversation as not successful when filling out the survey.


## Required actions (in order)
`pull_up_account` → `enter_details` → `send_link`


Wrap up by asking whether the customer needs anything else.
