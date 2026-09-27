# Status — 27 Sep, 15:20 PDT

Snapshot at 15:20. Final numbers are in `README.md` (Results).

Team **Support AGI** (Touko, Marc) · company **Northwind Outfitters** (online clothing retailer) · submission due 17:00.

## Update 15:20
- **Compiled routes built** (`agent/src/compiled.ts`, `replay/plans/`, `replay/compiled-eval.json`): 31 plans, 6 promoted; on their tickets 94% correct with 0 model calls (~$0.001, <3 ms vs $0.06–0.43, 6–26 s). New plans must shadow-match the agent on 3 tickets before serving.
- **Memorable is the real store**: 57 procedures ingested via the CLI (`agent/src/memorable-store.ts`, `RECALL_BACKEND=memorable`). QM fork now consults Memorable on every turn.
- **QM fork published**: https://github.com/ToukoUrsin/qm-support-agi (branch `support-agi`): Paths panel (matched path, its steps vs this run, EXPLORED / RECALLED / COMPILED, learning curve), Memorable provider fix, Northwind persona.
- **Hard tickets**: `data/hard_tickets.jsonl` (42; 15 from ABCD, 27 constructed). Expected to stay with the full agent.
- **Blocker**: Memorable `/v1/embed` rate limits (429) broke the final replay; restarting with a rate limiter, embedding cache and exact-key matching first. Target ≥200 clean tickets + hard tickets + baseline by 16:00. Asked Memorable to raise the limit.
- **Submission**: no slide deck. The video walks through the real UI (QM chat, Paths panel, Shopify) with 2–3 graph images; README has results placeholders until 16:00.
- **River (Marc)**: still needed — endpoint `POST {text}` → `{canonical, rendered}` per `CANONICAL_REQUEST_V1.md`, plus hit rate on `data/heldout.jsonl`. It also fills the inputs for compiled routes.

## Headline: routes that compile themselves
Every ticket takes the cheapest route that works: **explored** (agent solves from scratch; Memorable saves the path) → **recalled** (agent replays a learned path) → **compiled** (a path reused successfully ≥3 times becomes a deterministic JSON program: bindings from River's canonical request, tool calls, guards from GBrain policy, reply template; zero agent model calls, only the router runs). Guard failure or missing data falls back to the agent. Not everything compiles; the system learns to compile as much as it safely can. Plans live in `replay/plans/`.

## Working now
| Piece | State |
|---|---|
| Data | ABCD (ASAPP, MIT): 400 replay tickets, 100 held-out, each with the human agent's action sequence. `DATASET.md`, `data/` |
| GBrain | 71 pages: 55 procedures from ABCD agent guidelines, policies, catalog, FAQ |
| Support agent | Claude + GBrain + 24 shop tools (`agent/`); mock shop for replay, real Shopify for the live demo |
| Shopify | Dev store "Northwind Outfitters": 16 products with Unsplash photos (`data/PHOTO_CREDITS.md`), orders seeding (~5/min dev-store limit) |
| QM | Local fork runs the bot (localhost:8084) via MCP tools (`mcp/`); new **Paths** panel shows recalled vs explored path, steps, time, cost, learning curve |
| Memorable | Paths are extracted with Memorable's `/v1/extract` and embedded with `/v1/embed` |

## Corrections in progress (approved by Touko 14:50)
1. **Back to Marc's contract.** We had drifted: `data/ROUTER.md` asked River for one of 55 intent labels, which `CANONICAL_REQUEST_V1.md` explicitly rejects. River outputs the v1 structure (`canonical`); the app renders one English sentence (`rendered`) used for Memorable recall. The Claude Haiku normalizer is only a labeled **stand-in for River** until Marc's endpoint exists. Subflow labels are kept for evaluation only.
2. **Memorable owns storage and recall.** Until now saved paths lived in `replay/procedures.jsonl` and matching was our own cosine search. Moving to Memorable's real store and recall (`agent/src/memorable-store.ts`, `RECALL_BACKEND=memorable`), backfilling existing paths, and fixing QM's native Memorable provider (turns never consulted external memory providers).

## Interim numbers (ABCD, before corrections — not final)
- Baseline, no memory: $0.183 / ticket, 16.4 s, 5.0 tool calls (100 tickets).
- With learned paths: recall rate 24% → 81% across the run; recalled tickets $0.14 vs explored $0.22; overall cost/ticket only slightly lower yet. Being fixed: cheaper recalled execution.
- Held-out path hit rate: raw text 8–22% → standardized request 53–66% (Haiku stand-in). River's trained model should replace this number.

## Open for Marc (River)
- Nothing trained or deployed yet on GitHub (last push 14:17, design docs).
- Needed by **15:40**: endpoint `POST {text}` → `{canonical, rendered}` per `CANONICAL_REQUEST_V1.md`; set as `ROUTER_URL`. Train on ABCD (`data/abcd/raw`), excluding `data/tickets.jsonl` and `data/heldout.jsonl`.
- Report: hit rate on `data/heldout.jsonl` vs the stand-in (`bun replay/eval_router.ts`).

## Plan to 17:00
15:50 final numbers · 16:00 video kit (tickets, cards, script) · 16:05–16:35 Touko records · 16:40 repos public + form · 17:00 due.
