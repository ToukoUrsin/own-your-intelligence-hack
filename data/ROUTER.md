# Router spec (for Marc / River)

**Task:** map one raw customer ticket text → one standardized intent label (the saved-path key in Memorable).

- **Input:** `text` from `tickets.jsonl` / `heldout.jsonl` (plain string, often typo-ridden or colloquial). Ignore `email`.
- **Output:** exactly one label from the set below (optionally a confidence). Unknown/other → `none`, which sends the ticket to full exploration.
- **Train:** any rows of `raw/bitext-train.parquet` except `source_row`s in `heldout.jsonl` (and preferably not those in `tickets.jsonl`).
- **Evaluate:** accuracy (= path hit rate) on `heldout.jsonl` (100 messy tickets, flags Q/Z/W), compared with raw-text embedding match and the base model zero-shot.
- **Endpoint:** HTTP `POST /route {"text": "..."}` → `{"intent": "track_order", "confidence": 0.93}`.

## Label set (27 intents, Bitext names)
| Category | Intents |
|---|---|
| ACCOUNT | create_account, delete_account, edit_account, recover_password, registration_problems, switch_account |
| CANCEL | check_cancellation_fee |
| CONTACT | contact_customer_service, contact_human_agent |
| DELIVERY | delivery_options, delivery_period |
| FEEDBACK | complaint, review |
| INVOICE | check_invoice, get_invoice |
| ORDER | cancel_order, change_order, place_order, track_order |
| PAYMENT | check_payment_methods, payment_issue |
| REFUND | check_refund_policy, get_refund, track_refund |
| SHIPPING | change_shipping_address, set_up_shipping_address |
| SUBSCRIPTION | newsletter_subscription |

Each label has a brain page `procedures/<intent with dashes>` (e.g. `procedures/track-order`).
