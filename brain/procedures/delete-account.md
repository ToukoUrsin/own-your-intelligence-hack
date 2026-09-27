---
title: "Procedure: Delete an account"
type: procedure
intent: delete_account
category: ACCOUNT
---
# Delete an account

Intent `delete_account` (ACCOUNT). Customers say: close my account, delete my profile, remove my data.

1. `find_customer`. If they have processing or shipped orders, tell them deletion happens after those are delivered.
2. `request_account_deletion`: a confirmation email is sent; the account is deleted 14 days after confirmation. Invoices are kept 7 years for tax law.
3. Mention they can unsubscribe from email only ([[procedures/newsletter-subscription]]) if that's what they want.
