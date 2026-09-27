# Measured claims for the pitch and outreach

Checked 27 September 2026, 15:42 PDT against saved outputs. These are separate preliminary experiments, not a demonstrated combined production result.

## Final run (supersedes the replay numbers below)

The final cold-start run (commit `7120996`, 15:43 PDT) replaced `replay/results.jsonl` and `replay/baseline.jsonl`, so the paired-replay rows below describe an earlier run whose files are only in git history (`7120996^`). Recomputed from the files on main:

| Measure | Result | Scope |
|---|---|---|
| Same tickets vs no-memory agent | $0.1832 → $0.0996 per ticket, **46% lower** | First 100 of the 400 replay tickets, while the path library was still filling. Agent-model inference plus router cost estimate. |
| Learning curve | $0.1389 first 25 → $0.0469 last 25, **66% lower** | One run, so the buckets are different tickets. |
| Agent-model calls | 4.21 → 3.04 per ticket on the same 100 | Compiled plans make zero agent-model calls; the router still runs. |
| Recorded agent-stage time | 16,416 ms → 10,867 ms on the same 100 | Agent trace only, not end-to-end latency. |

99 of the 100 matched memory rows used River `r1@50` as the router (1 fell back to raw text). Answer-quality parity is from the separate gate check in `replay/SUMMARY.md` (Haiku judge), not from this pairing.

## Product and cost scope

The intended product uses a shared, fine-tuned generalist across customers. Customers do not need a separately trained model. The comparison measures ongoing inference/serving cost per task; training is outside this metric.

## Recommended pitch wording

> 18.3¢ → 10.0¢ on the same 100 tickets, 46% lower inference cost; 66% lower by the end of a 400-ticket run.

The earlier wording, 8.37¢ → 5.65¢ so 32%, came from the superseded replay. This is concrete enough for an honest preliminary-results slide or discovery email. Do not add “with no loss of quality,” “customer savings,” or “the combined fine-tuned system saved 32%”: those conclusions have not been established by these artifacts.

## Checked numbers

| Experiment | Recomputed result | Scope |
|---|---|---|
| Matched replay inference cost | Baseline $0.0836712; memory run $0.0565481 per ticket; **32.416% lower** across the same 100 IDs | Token-price estimate for agent-model inference and Haiku normalization. |
| Recorded agent-stage time | 10,340.05 ms to 8,011.57 ms; **22.52% lower** | `ms` comes from the agent trace. Normalization, memory lookup and learning overhead are outside this timing. Do not call it end-to-end latency. |
| Agent-model calls | 3.16 to 1.90 per ticket; **39.87% fewer** | Excludes the extra normalizer/model calls outside the support agent. Avoid an unqualified “40% fewer model calls.” |
| River label-router accuracy | Base **23/100**; step 20 **72/100**; step 50 **77/100** | Same current parser applied offline to saved raw outputs. **+54 percentage points**, not +54%. This is classification, not successful support resolution. |
| Selected compiled routes | Six enabled plans; 35 compiled executions; 33 judged correct (**94.3%**) among those executions | Offline mock-shop evaluation with a Haiku judge. Plans were selected using these same cases. Not held-out overall accuracy or production quality. |

The paired replay contains 194 memory-run records and 100 baseline records, with 100 common IDs. All paired memory rows say `normalizer: haiku`; they do not demonstrate River integration. The old rows do not record the memory backend, so they also do not prove the latest native Memorable-store integration. Outcome parity was not established by a matched quality evaluation. The cost estimate covers agent-model inference and Haiku normalization; Memorable service billing was not measured.

The raw label-router report stores older-parser base accuracy of 16%. Running `python3 router/rescore.py r1` applies the same current parser to every model and yields 23%, 72% and 77%. The build script excludes replay/evaluation conversation IDs and identical text; the actual local training-data file was unavailable for an independent overlap check. Multiple checkpoints were evaluated on this set, so do not present it as an untouched final test.

The compiled execution's “zero model calls” is **after normalization**, and its sub-millisecond to millisecond times measure mock-tool execution. Its displayed roughly $0.001 compiled cost is rounded normalization cost; other serving components were not measured. Avoid “99% cheaper,” “zero-AI system,” and “94% accuracy across all tickets.” Across all candidate plans, the artifact reports 203 tested cases, 119 compiled executions and a 29.1% compiled-and-judged-correct rate before selecting the six enabled plans.

The separate canonical-v1 experiment in `river/evidence/clothing-pilot/RESULTS.md` improved validator acceptance from 0/24 to 16/24, but full canonical matches remained 0/24 and manual review found real semantic errors. It is not the 77% label router and is not ready to support a semantic-reliability claim.

## Email wording for a new discovery conversation

Hi, I’m Marc, building at today’s YC hackathon. We’re building a platform that uses a shared, fine-tuned generalist, memory and reusable workflows to reduce inference costs. It does not require training a separate model for each customer.

On the same support tickets we measured 46% lower inference cost, and 66% lower by the end of a 400-ticket run. We’d like to test this on a real recurring workload.

Have you spent engineering time reducing the cost of repeated tasks in your product? What have you tried, and what remains expensive?

This copy is prepared, **not sent**. The earlier 45 emails did not include these newly checked performance claims.

## Evidence identity

- Final run (current main): `replay/results.jsonl` SHA-256 `68a7b319d03d6fdaed967e02deb2734a525b2eb79b66d604f5235432d505e6d9`; `replay/baseline.jsonl` SHA-256 `292781f0ce11d3fa7280b2703cd422a35503b93623a3e1301bb16fc52b710dc5`; `replay/summary.json` SHA-256 `437d47dea67dfe526355a70475de0da0ef7906d476c99ab4604c43bf0994589f`.
- Earlier paired memory records (superseded): `replay/results.jsonl` at `7120996^`, SHA-256 `9b7c0bc5db5a7039c366c2e3e7634ef234ac11204b30f174762f9a7a81588a9d`.
- Earlier baseline records (superseded): `replay/baseline.jsonl` at `7120996^`, SHA-256 `0457f9e360e84fd2f011bd63b77897c2bdeec5d7a801690b9392ecdc8e009c87`.
- Router outputs: `router/runs/r1/report.json`, SHA-256 `2241d4ad8a57ba3a54e0693af21ef077d91751cea73a7935eacd672df540cc25` when checked (on main it is `2aecec35026ed750f9aeab1c65c022fd667833df9bddd9ec3f90345d3d782099`; `python3 router/rescore.py r1` still gives 23%, 72% and 77%); checkpoint `claude-router-r1-step50` in River session `4dadc93c-d38c-40c2-b7b7-d86412059eb3`.
- Compiled evaluation: `replay/compiled-eval.json`, SHA-256 `4e8c5e74a758102f3d7a1e51b74a07880cf332e917a07385ea6cbde7debe56af`; generated `2026-09-27T21:56:45.420Z`.
- Canonical model report: `/Users/marcsmeds/.codex/worktrees/river-normalizer/YC-hackathon-27-sept-2026/river/evidence/clothing-pilot/RESULTS.md`.

Recheck these identities before refreshing the claims: other teammates are still changing the system.
