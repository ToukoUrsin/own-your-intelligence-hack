---
title: "Procedure: Switch plan (Standard, Plus, Business)"
type: procedure
intent: switch_account
category: ACCOUNT
---
# Switch plan (Standard, Plus, Business)

Intent `switch_account` (ACCOUNT). Customers say: upgrade account, switch to premium, downgrade to free, change account type.

1. `find_customer` and read the current plan. Map words: free/basic/freemium → Standard; premium/gold/pro/platinum → Plus; company/corporate → Business ([[company/kettle-and-co]]).
2. Standard ↔ Plus: `change_plan`. Upgrades start now; downgrades at the end of the paid period. See fees in [[procedures/check-cancellation-fee]].
3. Business requires approval: `create_case` type sales; sales replies within 1 business day.
