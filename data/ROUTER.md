# River normalizer spec (for Marc)

River implements **Marc's own contract, [`CANONICAL_REQUEST_V1.md`](../CANONICAL_REQUEST_V1.md)**. It does not classify tickets into intents, subflows or workflows.

- **Input:** the customer's messages: `text` from `tickets.jsonl` / `heldout.jsonl` (the opening customer turns of an ABCD conversation, max 3; brand names genericized, emails → `@example.com`). The harness keeps the originals, identity and context.
- **Output:** one canonical request v1 JSON object (`version`, `tasks`, `entities`, `unresolved`) exactly as in the contract: operations `retrieve|explain|assess|troubleshoot|request`, subject vocabulary, entities with exact bindings, reported/conditions/prohibitions predicates, no confidence, no workflow ids, no tools.
- **Endpoint:** `POST /route {"text": "..."}` → `{"canonical": {...v1...}, "rendered": "Task 1: Retrieve refund information for order_1.\nRequested outputs: status."}`. `rendered` is optional; if absent the app renders `canonical` with its deterministic renderer (`agent/src/canonical.ts`). Set `ROUTER_URL` and `agent/src/memory.ts` uses it for every ticket.
- **How it is used:** `rendered` is the only text sent to Memorable recall and stored as the procedure's request. Reuse is considered only between requests with the same goal signature (operation:subject per task); any `unresolved` item other than `missing_reference` sends the ticket to normal solving.
- **Registry:** the app's field registry (subjects, outputs, predicate fields, attributes) is in `agent/src/canonical.ts`, seeded from the demo domain (clothing retailer). Unknown operation/subject/kind → invalid → normal solving; unknown outputs/fields/attributes are dropped and counted.
- **Stand-in until River exists:** `NORMALIZER=haiku` ("Haiku stand-in for River"): claude-haiku-4-5 prompted with the contract emits the same v1 JSON; the same validator and renderer apply. Every result row records which normalizer served it.
- **Data:** ABCD (ASAPP, MIT), `data/abcd/raw/abcd_v1.1.json.gz` — 10,042 human-human conversations (train 8,034 / dev 1,004 / test 1,004). `tickets.jsonl` comes from `train` (`convo_id`), `heldout.jsonl` from `test` only: never train on it. Label v1 records first and derive text with the renderer, per the contract.
- **Evaluate:** `bun replay/eval_router.ts` on `heldout.jsonl` (100 tickets): recall hit rate = the recalled procedure was learned from a ticket of the same gold subflow; also wrong-recall and miss rates. Compared against raw-text recall and the Haiku stand-in; River is added automatically when `ROUTER_URL` is set. Results in `replay/router-eval.json`.
- **Gold workflow:** every ticket carries `actions` (the human agent's ABCD action sequence), used to score learned paths (`goldAgreement` in `replay/summary.json`).

## Evaluation labels (55 ABCD subflows in 10 flows; scoring only, never a River output)
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
