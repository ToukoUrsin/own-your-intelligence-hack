# River subflow router

LoRA fine-tune of `Qwen/Qwen3.6-35B-A3B-FP8` on River that maps a customer's opening message to one of the
55 ABCD subflows in `data/ROUTER.md` (the saved-path key). Separate from `river/` (canonical-request-v1
normalizer): own River session tag `experiment=claude-router`, own checkpoint names `claude-router-*`, port 8789.

- Data: ABCD train + dev openings (same `opening`/`label`/`genericize` rules as `data/build.py`), minus every
  `tickets.jsonl` and `heldout.jsonl` conversation. 8,316 train, 300 dev as validation. ABCD test is never used
  for training; `data/heldout.jsonl` (100, from test) is the headline eval.
- Prompt: system message with the label list; target is the bare label. Base model gets the same prompt.

```sh
uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python river-client==0.12.0
.venv/bin/python build_data.py
.venv/bin/python train.py --run r1                   # baseline + 100 steps x 64, evals at 20/50/100
.venv/bin/python serve.py --run r1                   # POST /route {"text"} -> {"intent","confidence"}
ROUTER_URL=http://127.0.0.1:8789/route bun replay/eval_router.ts
```

The key is read from hsec (`riverai-api-key`) or `RIVER_API_KEY`. Results: `runs/<run>/report.json`.
