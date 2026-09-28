# Dataset: switched to ABCD (27 Sep, 14:35)

We now use **ABCD — Action-Based Conversations Dataset** (ASAPP Research, MIT license): https://github.com/asappresearch/abcd
~10k human-to-human customer-service conversations for an online clothing retailer, each with the **ground-truth actions** the human agent took (pull-up-account, validate-purchase, offer-refund, …), flows/subflows (~55 intents), agent guidelines (kb.json / guidelines.json) and scenario data (customer, username, email, order id, products, membership level).

Bitext is retired for the demo (kept in data/raw for reference).

## For the River router (Marc)
- Raw data: `data/abcd/raw/` (being added now; until then download from the repo's `data/` folder: `abcd_v1.1.json.gz`, `kb.json`, `guidelines.json`, `ontology.json`).
- Training input: customer's opening message(s). Labels: ABCD `flow`/`subflow` (+ his CANONICAL_REQUEST_V1 structure).
- Our splits: `data/tickets.jsonl` (replay, ~400) and `data/heldout.jsonl` (100, evaluation) — **exclude both from training**. Updated `data/ROUTER.md` lands ~15:20.
- Endpoint our code calls: `ROUTER_URL`. What shipped is the River subflow router (`router/`): `POST /route {"text"}` → `{"intent", "confidence"}`. The code also accepts `{rendered, canonical}` from a canonical-v1 normalizer, which is not merged (branch `codex/river-normalizer`).
