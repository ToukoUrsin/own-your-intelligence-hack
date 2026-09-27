---
title: "Procedure: Get a copy of an invoice"
type: procedure
intent: get_invoice
category: INVOICE
---
# Get a copy of an invoice

Intent `get_invoice` (INVOICE). Customers say: send me my invoice, download bill, need a receipt.

1. Find it with `get_invoices` (invoice number, order number, or email).
2. `email_invoice` to the account email, and mention the PDF is also under Account → Invoices.
3. Invoices need a company name or VAT number? Update it on the account (`update_account`) and re-send.
