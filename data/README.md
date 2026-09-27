# Data

## Source
- **Bitext Customer Support LLM Chatbot Training Dataset**, Hugging Face `bitext/Bitext-customer-support-llm-chatbot-training-dataset` (train split, parquet conversion, downloaded 2026-09-27).
- 26,872 rows · 27 intents in 10 categories · fields `flags, instruction, category, intent, response`.
- Bitext describes it as a *hybrid synthetic* dataset: seeds extracted from natural customer texts, expanded with NLG, curated by linguists. Flags mark language variation (Q colloquial, Z typos/errors, W offensive, M morphological, L lexical, …).
- **License: CDLA-Sharing-1.0** (Community Data License Agreement – Sharing 1.0), per the dataset card. Redistribution of the data (and modified data) must carry the same license.

## Files
| File | What |
|---|---|
| `raw/bitext-train.parquet` | Original dataset, unmodified (6 MB). |
| `shop.json` | Synthetic Kettle & Co customers, orders, tracking and refunds used by `agent/src/shop.ts`. |
| `build.py` | Deterministic builder: `uv run --with pandas --with pyarrow python data/build.py`. |
| `tickets.jsonl` | 400 replay tickets, long-tail mix across all 27 intents (track_order 118 … check_cancellation_fee 3), shuffled with a fixed seed. |
| `heldout.jsonl` | 100 other tickets with messy wording (flags Q/Z/W), ~4 per intent, for router hit rate. Never overlaps `tickets.jsonl`. |
| `ROUTER.md` | Spec for the River router. |

Ticket fields: `id`, `text` (Bitext instruction), `intent`, `category`, `email` (synthetic sender, matches `shop.json`), `flags`, `source_row`.
Bitext placeholders in ticket text are filled from `shop.json` so they resolve in the mock shop: `{{Order Number}}` → one of the sender's orders (processing for cancel/change, shipped for tracking, delivered for refunds), `{{Invoice Number}}`, `{{Person Name}}`, `{{Refund Amount}}`, `{{Account Type}}`/`{{Account Category}}` → Standard/Plus/Business, cities and countries. Tickets without an order number are answered by looking the sender up by `email`. Agents should pass the ticket as `From: <email>\n\n<text>`.

The knowledge base in `brain/procedures/` has one procedure per intent, summarized from the dataset's responses and rewritten with concrete Kettle & Co facts instead of placeholders.
