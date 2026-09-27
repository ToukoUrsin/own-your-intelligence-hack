# Replay summary

The final run (cold start, 400 ABCD + 42 hard tickets) is in `results.jsonl` and `summary.json`. This file adds the reuse-gate check.

## Reuse gate check (warm)

**Problem.** In the final run, 33 of 42 hard tickets reused a stored path and 20 of those used the wrong subflow's procedure. Recalled paths matched the human agent's action set only 13% of the time.

**Gate** (`agent/src/memory.ts` `gateReason`, also applied in the MCP `recall_path` and `try_compiled`). A path is recalled or compiled only when River's confidence is at least 0.7 and a cheap regex finds no second request ("two things", "also", "while I have you", or 3 or more question marks). Gated tickets go to the full agent, learn nothing, and carry `gate_reason`.

**Threshold.** Chosen on `data/heldout.jsonl` (`gate-calibration.json`). At 0.7, the gate keeps 75 of 77 correct routes and removes 13 of 23 misroutes. The full curve for 0.5–0.9 is in `gate-check.json`.

**Setup.** 42 hard tickets plus the last 100 normal tickets of the final run, at concurrency 8. The run starts from the final run's learned store (copied to `gate-check/`), so it is warm on tickets the store already learned from. Recall uses the local store, so the shared Memorable store was not changed. Baseline means the same tickets run through the full agent with no memory.

| | Hard (42) | Normal (100) |
|---|---|---|
| Sent to full agent | 26% (11: 7 low confidence, 4 multi-request) | 13% explored (10 gated) |
| Wrong-procedure reuse | **24%** gated vs 48% ungated | 13% vs 18% |
| Reused (recalled + compiled) | 31 vs 34 ungated | 87% vs 100% ungated |
| Cost/ticket | $0.104 gated · $0.086 ungated · $0.223 baseline | $0.064 gated · $0.046 ungated · $0.198 baseline |
| Exact action-set match | 13% gated · 13% ungated · 18% baseline | 14% · 13% · 21% |
| Haiku judge "resolved per policy" | 40% gated · 36% ungated · 38% baseline | 29% · 27% · 26% |

The judge splits by gated tier as follows. Hard tickets: recalled 29%, explored 64%. Normal tickets: recalled 22%, compiled 37%, explored 46%.

**Honest read.**
- The gate halves wrong-procedure reuse on hard tickets and costs about 1.4× on normal tickets, which is still about 3× cheaper than baseline.
- It does not fix the main problem. River gives confident labels to most hard tickets (rare subflows, contradictions, policy edges: 26 of the 34 hard tickets the final run reused score ≥ 0.7), so 24% still get the wrong procedure.
- Recalled paths still match human actions less often than the full agent. Only 1 of 60 normal recalls matched exactly.
- The judge sees the ticket, the reply, the policy and the human actions, but not the shop database. Its absolute yes-rates are low and only comparable within this table.
- The ungated numbers are the final run's rows for the same tickets, not a rerun.

**Next.** A per-procedure check that the recalled path's first lookups agree with the ticket (order state, membership) before replaying. The router confidence alone is not enough.
