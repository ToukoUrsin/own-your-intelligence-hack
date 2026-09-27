# Router spec (for Marc / River)

**Task:** map one raw customer ticket text to one standardized request label (the saved-path key in Memorable). Keep `CANONICAL_REQUEST_V1.md` in mind: the label is the ABCD subflow; subjects/operations can be derived from it (e.g. `refund_status` → retrieve/refund, `refund_initiate` → request/refund, `return_size` → request/return, `status` → retrieve/delivery, FAQ subflows → explain/product_information or policy).

- **Data:** ABCD (ASAPP, MIT), `data/abcd/raw/abcd_v1.1.json.gz` — 10,042 human-human conversations for an online clothing retailer (train 8,034 / dev 1,004 / test 1,004). Labels in `scenario.flow` / `scenario.subflow`.
- **Input:** `text` from `tickets.jsonl` / `heldout.jsonl` = the customer's opening message(s) (customer turns before the agent's first action, max 3; brand names genericized, emails → `@example.com`). Ignore `email`.
- **Output:** exactly one subflow label below (optionally a confidence). Unknown/other → `none` (full exploration).
- **Label normalization:** FAQ subflows collapse to their topic (`timing_1`…`timing_4` → `timing`, `boots_how_2` → `boots`); ABCD v1.1 aliases `status_questions` → `status_active`, `status_delivery_date` → `status_delivery_time`. Use `label()` in `data/build.py`.
- **Train:** ABCD `train` (and `dev`) conversations; `tickets.jsonl` comes from `train` (`convo_id` field), so exclude those convo_ids if you want a clean replay. `heldout.jsonl` comes from `test` only — never train on it.
- **Evaluate:** accuracy (= path hit rate) on `heldout.jsonl` (100 tickets, 1–2 per label), vs raw-text embedding match and the base model zero-shot.
- **Gold workflow:** every ticket carries `actions` (ABCD action sequence with slot values), for comparing the learned path with the human agent's workflow.
- **Endpoint:** HTTP `POST /route {"text": "..."}` → `{"intent": "refund_status", "confidence": 0.93}`.

## Label set (55 subflows in 10 flows)
| Flow | Subflows |
|---|---|
| account_access | recover_username, recover_password, reset_2fa |
| manage_account | status_service_added, status_service_removed, status_shipping_question, status_credit_missing, manage_change_address, manage_change_name, manage_change_phone, manage_payment_method |
| order_issue | status_mystery_fee, status_delivery_time, status_payment_method, status_quantity, manage_upgrade, manage_downgrade, manage_create, manage_cancel |
| product_defect | refund_initiate, refund_update, refund_status, return_stain, return_color, return_size |
| purchase_dispute | bad_price_competitor, bad_price_yesterday, out_of_stock_general, out_of_stock_one_item, promo_code_invalid, promo_code_out_of_date, mistimed_billing_already_returned, mistimed_billing_never_bought |
| shipping_issue | status, manage, missing, cost |
| single_item_query | boots, shirt, jeans, jacket |
| storewide_query | pricing, membership, timing, policy |
| subscription_inquiry | status_active, status_due_amount, status_due_date, manage_pay_bill, manage_extension, manage_dispute_bill |
| troubleshoot_site | credit_card, shopping_cart, search_results, slow_speed |

Each label has a brain page `procedures/<flow>-<subflow>` with dashes (e.g. `procedures/shipping-issue-status`, `procedures/product-defect-refund-status`).
