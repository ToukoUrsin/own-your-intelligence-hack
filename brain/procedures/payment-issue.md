---
title: "Procedure: Payment problems"
type: procedure
intent: payment_issue
category: PAYMENT
---
# Payment problems

Intent `payment_issue` (PAYMENT). Customers say: payment failed, card declined, charged twice, can't pay, problem with payment.

1. Find the customer's recent orders (`find_orders` by email) and read each order's payment status.
2. **failed** → the order stays processing for 48 h; ask them to retry at kettleandco.example/account/orders or use another method (see [[procedures/check-payment-methods]]).
3. Charged twice → a pending authorization disappears in 3–5 business days. If the order shows a real duplicate capture, `issue_refund` the duplicate.
4. Charged but no order → `create_case` type payment with the charge details; finance replies within 1 business day.
