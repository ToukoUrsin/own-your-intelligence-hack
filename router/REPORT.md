# River router: state of training (27 Sep, 15:17 PDT, run `r1` in progress)

Task (data/ROUTER.md): customer's opening message → one of 55 ABCD subflows (the saved-path key).
Metric: label accuracy on `data/heldout.jsonl` (100 tickets, ABCD test, 1–2 per label) = path hit rate for an exact-key library.

## Results so far

Same system prompt (label list) for every row; greedy decoding. Rows in `runs/r1/report.json`; `rescore.py r1` recomputes from raw outputs.

| Model | heldout (100) | val (300, ABCD dev) |
|---|---|---|
| Raw ticket text, embedding recall (team's `replay/router-eval.json`, hit rate) | 0.08–0.22 | – |
| Qwen3.6-35B-A3B base, zero-shot | 0.23 | 0.22 |
| Claude Haiku 4.5, label mode (team's `replay/router-eval.json`) | 0.64–0.66 | – |
| **River LoRA, step 20** | **0.72** | **0.82** |
| **River LoRA, step 50** | **0.77** | **0.887** |

Base-model misses are mostly flow-only answers (`troubleshoot_site`, `single_item_query`) that cannot select a path.
Step-50 heldout errors are near-neighbours: `promo_code_invalid`↔`promo_code_out_of_date` (2), `refund_update`→`refund_status` (2), shipping `cost`→`status` (2).

## Run

- Base `Qwen/Qwen3.6-35B-A3B-FP8`, LoRA rank 16, lr 2e-4, batch 64, cross-entropy on the label tokens only (~329 tokens/example).
- Data: 8,316 ABCD train+dev openings (same opening/label/genericize rules as `data/build.py`); every `tickets.jsonl` and `heldout.jsonl` conversation excluded; ABCD test unused for training.
- Speed: ~14 s/step (first step 30 s); checkpoint eval of 400 prompts ~20 s.
- Cost so far: 1.35M training tokens ≈ $1.35 at the console rate of $1.00/M (estimate, not a billed figure).
- Stop: 100 steps or 25 min of training, whichever first; at the current pace the final checkpoint lands around step 85–90 (~15:23).
- Isolation from `river/` (canonical-v1 normalizer, branch `codex/river-normalizer`): separate branch and directory, River session tag `experiment=claude-router`, checkpoint names `claude-router-*`, port 8789. Same hsec key `riverai-api-key`.

## Endpoint

`serve.py --run r1 --step 50` is live on `http://127.0.0.1:8789/route` (Marc's Mac): `POST {"text"}` → `{"intent","confidence"}`,
the shape `agent/src/memory.ts` accepts. ~4 s per call (checkpoint load per request), 8 parallel calls in ~6 s.
Use `ROUTER_URL=http://127.0.0.1:8789/route`.

## Open

- Recall eval through the team harness (`eval_recall.ts`, River-only copy of `replay/eval_router.ts`) is blocked: the Memorable key hit its 5,000 requests/day quota (HTTP 429) at 15:11. Rerun when it clears.
- Final checkpoint eval and switching the endpoint to it.
