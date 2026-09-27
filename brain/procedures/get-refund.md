---
title: "Procedure: Request a refund"
type: procedure
intent: get_refund
category: REFUND
---
# Request a refund

Intent `get_refund` (REFUND). Customers say: I want my money back, refund request, return for refund, reimbursement.

1. Find the order and read [[policies/returns-refunds]].
2. Processing → cancel instead ([[procedures/cancel-order]]).
3. Delivered within 30 days, unused → return: refund after the warehouse receives it, minus $8 label unless damaged or wrong item. Issue a return label (say it will be emailed) and explain timing.
4. Damaged, wrong item, or lost parcel → act now: `issue_refund` (or `reship` if they prefer). Under $80 damaged: no return needed.
5. Defective grinder or kettle → warranty ([[policies/warranty]]) before refund.
6. Over 30 days and not defective → decline politely, offer warranty help if relevant.
