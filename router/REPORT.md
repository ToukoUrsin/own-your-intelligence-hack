# River router: state of training (27 Sep, 15:36 PDT; `r1` finished, `r2` training)

Task (data/ROUTER.md): customer's opening message → one of 55 ABCD subflows (the saved-path key).
Metric: label accuracy on `data/heldout.jsonl` (100 tickets, ABCD test, 1–2 per label) = path hit rate for an exact-key library.

## Results

Same system prompt (label list) for every row; greedy decoding. Rows in `runs/r1/report.json`; `rescore.py r1` recomputes from raw outputs.

| Model | heldout (100) | val (300, ABCD dev) |
|---|---|---|
| Raw ticket text, embedding recall (team's `replay/router-eval.json`, hit rate) | 0.08–0.22 | – |
| Qwen3.6-35B-A3B base, zero-shot | 0.23 | 0.22 |
| Claude Haiku 4.5, label mode (team's `replay/router-eval.json`) | 0.64–0.66 | – |
| **River LoRA, step 20** | **0.72** | **0.82** |
| **River LoRA, step 50 (served)** | **0.77** | **0.887** |
| River LoRA, step 87 (final, time limit) | 0.76 | 0.867 |

Base-model misses are mostly flow-only answers (`troubleshoot_site`, `single_item_query`) that cannot select a path.
Step 50 is served: best on validation (chosen on val, not heldout); step 50→87 is flat within noise. Step-50 heldout errors are near-neighbours: `promo_code_invalid`↔`promo_code_out_of_date` (2), `refund_update`→`refund_status` (2), shipping `cost`→`status` (2).

## Team recall harness (Memorable bge-m3 embeddings, `eval_recall.ts` = River-only `replay/eval_router.ts`)

Library = first replay ticket per intent, filed under the router's key; 100 held-out tickets recalled against it.

| Normalizer | lib | hit | wrong recall | miss |
|---|---|---|---|---|
| raw text (team's run) | 55 | 0.08 | 0.05 | 0.87 |
| Haiku 4.5 (team's run) | 44 | 0.53 | 0.30 | 0.17 |
| River step 50, no gate | 47 | 0.65 | 0.25 | 0.10 |
| **River step 50, gate 0.5 (serve.py default)** | 47 | **0.67** | **0.15** | 0.18 |
| River step 50, gate 0.8 | 44 | 0.58 | 0.09 | 0.33 |

Gate: below `--min-confidence` the router answers `none` and the agent explores (confidence = probability of the label tokens).
0.5 beats no gate on both hit and wrong recall. 0.8 is the cautious setting (fewest wrong replays).
Wrong recall mostly comes from a mislabelled *first* ticket filing its workflow under another intent's key (47 of 55 keys created).

## Workflow stability without Memorable (`analyze.py`, 400 replay tickets in order, exact-key library)

| Router | accuracy | mean confidence | workflows (correct key) | correct reuse | wrong reuse |
|---|---|---|---|---|---|
| Qwen base | 0.31 | 0.67 | 31 (18) | 0.375 | 0.128 |
| River step 50 | 0.865 | 0.89 | 52 (42) | 0.733 | 0.133 |
| River step 50, gate 0.5 | – | – | 52 (45) | 0.72 | 0.09 |
| River step 50, gate 0.8 | – | – | 51 (47) | 0.657 | 0.04 |

Validation gate curve (step 50): gate 0.5 routes 96% at 0.92 accuracy; 0.8 routes 86% at 0.953; 0.9 routes 77% at 0.97.

## Run

- Base `Qwen/Qwen3.6-35B-A3B-FP8`, LoRA rank 16, lr 2e-4, batch 64, cross-entropy on the label tokens only (~329 tokens/example).
- Data: 8,316 ABCD train+dev openings (same opening/label/genericize rules as `data/build.py`); every `tickets.jsonl` and `heldout.jsonl` conversation excluded; ABCD test unused for training.
- Speed: ~14 s/step (first step 30 s); checkpoint eval of 400 prompts ~20 s.
- Cost: 1.83M training tokens ≈ $1.83 at the console rate of $1.00/M (estimate, not a billed figure).
- Stopped by the 25-minute limit after step 87 (~0.67 epoch). Checkpoints: steps 20, 50, 87.
- Isolation from `river/` (canonical-v1 normalizer, branch `codex/river-normalizer`): separate branch and directory, River session tag `experiment=claude-router`, checkpoint names `claude-router-*`, port 8789. Same hsec key `riverai-api-key`.

## Endpoint

`serve.py --run r1 --step 50` (gate 0.5 default) is live on `http://127.0.0.1:8789/route` (Marc's Mac): `POST {"text"}` → `{"intent","confidence"}`,
the shape `agent/src/memory.ts` accepts. ~4 s per call (checkpoint load per request), 8 parallel calls in ~6 s.
Use `ROUTER_URL=http://127.0.0.1:8789/route`.

## Open

- `r2`: same recipe plus label-balanced sampling (p ~ count^0.5) and linear LR decay to 10%, 90 steps, evals at 30/60/90.
