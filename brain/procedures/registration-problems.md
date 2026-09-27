---
title: "Procedure: Sign-up problems"
type: procedure
intent: registration_problems
category: ACCOUNT
---
# Sign-up problems

Intent `registration_problems` (ACCOUNT). Customers say: error when registering, can't sign up, verification email not received.

1. `find_customer`: if the account exists, it's a verification or login problem → `send_password_reset` (also verifies the email).
2. No account → `create_account` for them.
3. Persistent error messages → `create_case` type bug with the message they saw.
