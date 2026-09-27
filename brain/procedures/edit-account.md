---
title: "Procedure: Edit account details"
type: procedure
intent: edit_account
category: ACCOUNT
---
# Edit account details

Intent `edit_account` (ACCOUNT). Customers say: change my name, update email, update phone, edit profile, correct data.

1. `find_customer` by the sender's email.
2. `update_account` with the changed fields (name, phone, default address). Email changes need confirmation from the new address, which the tool triggers.
3. Confirm what changed.
