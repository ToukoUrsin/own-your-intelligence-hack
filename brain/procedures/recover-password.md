---
title: "Procedure: Password reset"
type: procedure
intent: recover_password
category: ACCOUNT
---
# Password reset

Intent `recover_password` (ACCOUNT). Customers say: forgot password, can't log in, reset my password, recover account.

1. `send_password_reset` to the account email (the sender's email unless they give another). Never reset to an address that is not on the account.
2. Tell them the link expires in 30 minutes and to check spam. Page: kettleandco.example/account/recover.
3. No account found → offer [[procedures/create-account]].
