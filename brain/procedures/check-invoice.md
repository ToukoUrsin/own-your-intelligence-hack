---
title: "Procedure: View an invoice"
type: procedure
intent: check_invoice
category: INVOICE
---
# View an invoice

Intent `check_invoice` (INVOICE). Customers say: see my invoice, check bill, invoice details, bill amount.

1. `get_invoices` by invoice number, order number or the sender's email.
2. Summarize invoice number, date, amount and status (paid, due, refunded) and give the link kettleandco.example/account/invoices.
3. Business Net-30 invoices: due 30 days after the order date.
