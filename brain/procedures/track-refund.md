---
title: "Procedure: Refund status"
type: procedure
intent: track_refund
category: REFUND
---
# Refund status

Intent `track_refund` (REFUND). Customers say: where is my refund, reimbursement not received, refund status.

1. `get_refunds` by order number or the sender's email.
2. **sent** → give the date and method; cards take 3–5 business days, PayPal 1 day. If more than 7 business days have passed, open a `create_case` (type payment) for finance.
3. **waiting_for_return** → the refund is sent when the return reaches the warehouse; share the return label status.
4. No refund on file → check the order; if one is owed per [[policies/returns-refunds]], handle as [[procedures/get-refund]].
