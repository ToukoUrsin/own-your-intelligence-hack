# Support AGI — support that compiles itself

**Result: 3rd place overall** at the YC Own Your Intelligence Hackathon (27 Sep 2026).

**A customer-support agent that gets cheaper the more tickets it handles.** It remembers how it solved each kind of request, replays that path next time, and compiles well-proven paths into plans that answer without calling the agent model. Replaying 400 ABCD support conversations, cost per ticket fell 66% from the first 25 tickets to the last 25.

Team **Support AGI**: Touko Ursin and Marc Smeds · Own Your Intelligence Hackathon, YC San Francisco, 27 September 2026 · built in about three hours (first line of code 13:58, final 442-ticket run 15:43 PDT).

| | |
|---|---|
| **−66%** | cost per ticket within one cold-start run: $0.139 for the first 25 tickets → $0.047 for the last 25 |
| **−46%** | against the same agent without memory on the same first 100 tickets ($0.183 → $0.10), while it was still learning |
| **0** | agent model calls on compiled tickets: a JSON plan answers in milliseconds and only the router runs |
| **77%** | accuracy of our own River-trained router on 100 held-out tickets (base model 23%, Claude Haiku 64–66%), trained for about $1 |

[QM fork with the Paths panel](https://github.com/ToukoUrsin/qm-support-agi) · [Storefront chat](#try-it) · [How each platform is used](PLATFORMS.md) · [Validation](VALIDATION.md)

## The idea

Support teams answer the same kinds of requests thousands of times, and an agent pays full model price for every one of them. Support AGI treats each solved ticket as a lesson.

The first time a kind of request arrives, Claude solves it from scratch with the company's knowledge and tools, and Memorable saves the path it took. The next similar request, recognized by our River-trained router, replays that path in fewer steps. Once a path has proven itself, it compiles into a deterministic program that answers with **zero agent model calls**. Anything a program's guards cannot handle goes back to the agent. Not every ticket compiles; the system compiles what it safely can.

The router model, the learned paths and the compiled programs all belong to the business. That is our take on owning your intelligence.

## How it works

![Architecture: River routes each ticket to compiled, recalled or explored](video/graphs/architecture.png)

Every ticket takes the cheapest route that works:

| Route | What runs | Agent model calls per ticket | Cost per ticket | Share of the 400 tickets |
|---|---|---|---|---|
| **Explored** | Claude Opus 5 with the company brain (GBrain) and 22 shop tools, no prior path | 4.2 | $0.191 | 12% |
| **Recalled** | Claude replays a learned path at low effort, limited to that path's tools, with its policy text attached | 2.5 | $0.059 | 73% |
| **Compiled** | A JSON program: bindings from the request, tool calls, guards from GBrain policy, reply template | **0** (router only) | $0.0003 | 15% |

For each ticket:

1. **Route.** The River router maps the customer's message to one of 55 request types, with a confidence score.
2. **Gate.** Only confident (≥ 0.7), single-request tickets may reuse anything; the rest go to the full agent.
3. **Compiled.** If a promoted plan exists for the request type and its policy guards pass, it answers without the agent.
4. **Recalled.** Otherwise, if the library has a path for the request type, Claude replays it.
5. **Explored.** Otherwise Claude solves the ticket with GBrain and the shop tools, and Memorable extracts the path.
6. **Compile.** A path reused successfully three times becomes a plan. The plan runs in shadow next to the agent and is promoted only after two of three agreements.

## Built on four platforms

- **River AI: our own router model.** Marc fine-tuned Qwen3.6-35B-A3B with LoRA on River, on 8,316 ABCD conversation openings, excluding every replay and evaluation ticket. The served checkpoint (step 50) reaches 77% label accuracy on 100 held-out tickets and a 65% path hit rate in our recall harness, against 56% for Claude Haiku and 8% for raw ticket text. Training to that checkpoint used about 1.05M tokens (≈ $1.05 at River's console rate; both full training runs together ≈ $3.40). It routed 440 of the 442 tickets in the final run, with an injection guard and a low-confidence fallback. `router/`
- **Memorable: procedure memory.** Each newly solved ticket goes to Memorable's `/v1/extract`, which turns the session into a reusable procedure. Procedures are ingested into the Memorable workspace with its CLI and looked up for later tickets (`agent/src/memorable-store.ts`, `RECALL_BACKEND=memorable`). All 52 learned paths in the final run carry Memorable-extracted steps. We also fixed QM's Memorable provider, which was never consulted on chat turns.
- **GBrain: the company brain.** 71 pages: 55 procedures written from ABCD's agent guidelines, plus policies, product catalog and FAQ. The agent searches it on every explored ticket, and compiled plans take their guards from its policy pages (return windows by membership level, cancellation only before shipping, promo-code eligibility). `brain/`
- **QM: where customers chat.** Our fork runs the support bot with our tools over MCP and adds a **Paths panel**. For every turn it shows the route (EXPLORED / RECALLED / COMPILED), the matched path against this run's steps, time, cost, a live route map and the learning curve. Promoted plans answer through a pre-turn hook before the model is called. [ToukoUrsin/qm-support-agi](https://github.com/ToukoUrsin/qm-support-agi) (branch `support-agi`), `mcp/`

Exact API calls, training setup and serving details: [PLATFORMS.md](PLATFORMS.md).

## Results

Final cold-start run: the agent starts with no paths and no plans and handles 400 ABCD tickets in arrival order, with 42 hard tickets interleaved. River router, Memorable, mock shop.

![Cost per ticket falls as paths are learned](video/graphs/cost-per-ticket.png)
![Route share per bucket](video/graphs/tier-share.png)

| Metric | Result |
|---|---|
| Cost per ticket, first 25 → last 25 | **$0.139 → $0.047 (−66%)** |
| Time per ticket, first 25 → last 25 | 13.6 s → 6.2 s (−54%) |
| Same first 100 tickets vs the agent without memory | **$0.183 → $0.10 (−46%)**, while the path library was still filling |
| Last 25 tickets vs the agent without memory | $0.047 vs $0.183 per ticket (−74%) |
| Routes, last 25 tickets | 88% recalled · 12% compiled · 0% explored |
| Path library | 52 paths, all learned during the run; reused 325 times |
| Compiled plans | 94% agreement with the agent's reply (33 of 35, Haiku-judged, offline eval of 6 enabled plans). In the final run, 3 plans passed shadow promotion; refund status and password recovery answered 60 of the 400 tickets with zero agent model calls |
| Router, 100 held-out tickets | River 77% label accuracy; path hit rate River 65% · Haiku 56% · raw text 8% |
| Answer quality (Haiku judge, "resolved per policy") | on par with the agent without memory: 29% vs 26% on normal tickets, 40% vs 38% on hard tickets |
| Hard tickets with the reuse gate | wrong-procedure reuse halved (48% → 24%) at under half the no-memory cost ($0.104 vs $0.223) |

![Hard vs normal tickets](video/graphs/hard-vs-normal.png)

The graphs bucket all 442 tickets in arrival order; the table's first and last 25 are from the 400 ABCD tickets. Costs are token-priced estimates (Claude Opus 5 at $5 / $25 per million input / output tokens) plus the router. Raw outputs: `replay/summary.json`, `replay/summary-baseline.json`, `replay/gate-check.json`, `replay/compiled-eval.json`, `replay/router-eval.json`, `router/REPORT.md`; analysis in `replay/SUMMARY.md`.

**Known limits.**
- Matching the human agent's exact action set is hard for every setup, including the agent without memory: 27% for the no-memory agent, 23% explored, 13% recalled, 52% compiled.
- On long-tail tickets a confident router can still pick the wrong procedure: with the gate, 24% of hard tickets reuse the wrong one. The next fix is a per-procedure check before replay (see Next steps).
- The 94% compiled-plan figure comes from an offline eval of plans selected with those same tickets. The judge sees the ticket, reply, policy and human actions, but not the shop database, so its rates are comparable only within a table.

## Try it

- **QM chat with the Paths panel:** [ToukoUrsin/qm-support-agi](https://github.com/ToukoUrsin/qm-support-agi), branch `support-agi`, with our MCP server (`mcp/start.sh`) against the Shopify dev store. `mcp/demo.sh` stages the demo: ticket A explores and saves its path, ticket B recalls it, a refund-status ticket runs compiled.
- **Storefront chat** (`storefront/`): a chat bubble on the Shopify dev store "Northwind Outfitters" ([kettle-and-co-support-hack.myshopify.com](https://kettle-and-co-support-hack.myshopify.com)) with the same pipeline. Learning is off, and every tool call is restricted to the customer's own email and orders. The store is password-protected; the password is given on request.
- **Replay the learning curve** yourself: see [Run](#run).

## Data

- **ABCD** (Action-Based Conversations Dataset, ASAPP Research, MIT license): customer-service chats for an online clothing retailer, each with the **action sequence the human agent took**. 400 tickets for replay and 100 held out for evaluation; the agent's tool calls are scored against the human actions. The chats were role-played through ASAPP's Expert Live Chat, not taken from live customers. See `DATASET.md`, `data/README.md`.
- **Shopify dev store "Northwind Outfitters":** 16 products with Unsplash photos (`data/PHOTO_CREDITS.md`) and test orders seeded from the ABCD customers (`data/seed_shopify.ts`). The live demos run against it.
- **Hard tickets** (`data/HARD_TICKETS.md`): 42 long-tail tickets. 15 are ABCD conversations (the longest, changed requests, the rarest intents) and 27 are edge cases we wrote (multiple requests, missing identifiers, contradictions, policy edges, angry customers, must-escalate, non-English, typos). They test that the cheap routes hand off instead of misrouting.

## What's real and what's simulated

- **Real:** the Claude agent, GBrain, Memorable API and CLI calls, River training and inference, the QM fork, the Shopify dev store and its API calls, and all measured costs and times.
- **Dataset:** ABCD conversations and human action sequences were role-played by ASAPP's collectors, not live customer tickets.
- **Test data:** the Shopify store is a development store with test orders; no real customers or payments.
- **Mock shop for replay:** the 442-ticket replay uses a local mock of the same shop data (`agent/src/shop.ts`) so it runs fast and repeatably. The live demos use Shopify.
- **Constructed:** 27 of the 42 hard tickets were written by us and are labeled `source: "constructed"`.
- **Offline validation:** compiled-plan accuracy is judged by Claude Haiku, comparing the compiled reply with the agent's reply on the same ticket.

## Run

```bash
# GBrain with the company brain
GBRAIN_HOME=$PWD/.brain-home gbrain init --pglite --no-embedding
GBRAIN_HOME=$PWD/.brain-home gbrain import brain/ --no-embed

# One ticket through the agent
cd agent && bun install
ANTHROPIC_API_KEY=... bun run src/cli.ts "where is my refund? crystalm392@example.com"

# River router (see router/README.md), then replay the learning curve on the mock shop
ROUTER_URL=http://127.0.0.1:8789/route RECALL_BACKEND=memorable bun ../replay/run.ts --n 400 --bucket 25
bun ../replay/compile_eval.ts     # compile, validate and simulate the three routes
bun ../replay/eval_router.ts      # router hit rate on the 100 held-out tickets
bun ../replay/gate_check.ts       # reuse gate on hard and normal tickets

# MCP server for QM (Shopify backend)
../mcp/start.sh
```

Keys: `ANTHROPIC_API_KEY`, `MEMORABLE_API_KEY`, `SHOPIFY_ADMIN_TOKEN`, and a River key for the router. Without `ROUTER_URL`, `NORMALIZER=haiku` uses a Claude Haiku stand-in for the router.

## Repository

| Path | What |
|---|---|
| `agent/` | Support agent, router client, reuse gate, path memory, compiled plans, Shopify backend |
| `router/` | River router: data build, LoRA training, evaluation, server (`REPORT.md`) |
| `mcp/` | MCP server with the shop and brain tools, `recall_path` / `save_path`, `try_compiled` for QM |
| `replay/` | Replay harness, evaluations, learned paths, compiled plans and raw results |
| `brain/` | The 71 GBrain pages |
| `data/` | ABCD splits, hard tickets, shop fixtures, Shopify seeder |
| `storefront/` | Chat widget and backend for the Shopify storefront |
| `video/` | Demo script, demo tickets, graphs |
| `design-system/` | UI tokens and components for the Paths panel and video cards (`DESIGN.md`) |
| `validation/` | Customer outreach records and checked claims (`VALIDATION.md`) |
| `event/` | Hackathon rules, notes and submission text |
| `jorney/` | Archive for our Codex and Claude Code conversations |
| `IDEA.md`, `CANONICAL_REQUEST_V1.md`, `PLAN.md` | Design records from the start of the day |

## Built during the hackathon

All code was written during hacking hours. No prior projects or code were reused; the only fork is QM, which QM's side quest invites. Times are commit times, PDT.

| Time | What landed |
|---|---|
| 13:00–13:40 | Hackathon brief, rules, opening notes |
| 13:56–14:06 | Core idea and agreed design; first code: support agent on GBrain with shop tools and step traces |
| 14:12–14:27 | Memorable layer and replay harness; MCP server for QM; Shopify backend; canonical request contract; switch to ABCD |
| 14:29–14:49 | Northwind Outfitters brain, catalog and store seeding; QM tools on Shopify; Memorable-backed procedure store |
| 14:54–15:12 | Request normalizer stand-in; compiled plans with shadow promotion; 42 hard tickets; design system |
| 15:17–15:37 | River router merged (LoRA training, evaluation, endpoint); compiled route in QM chat; demo kit; architecture diagram |
| 15:43 | **Final cold-start run**: 442 tickets through River, Memorable, recall and compiled plans |
| 15:51–15:53 | Reuse gate; second River training run; gate check on hard and normal tickets |
| 16:06–16:24 | Storefront chat on the Shopify store; router server hardening; validation records; final demo script |
| 16:51– | Documentation |

Full history: `git log`. QM fork commits: Paths panel, compiled routes, Memorable provider fix, Northwind support persona.

## Next steps

- **Smarter library growth:** create new paths only at ≥ 0.8 router confidence and reuse at ≥ 0.5. In simulation this cuts wrong reuse from 9% to 6% at the same correct reuse (`router/REPORT.md`).
- **Check before replay:** confirm a recalled path's first lookups fit the ticket (order state, membership) before following it.
- **Richer request structure on River:** operation, subject and entities rather than one label, so plans can match on structure (`CANONICAL_REQUEST_V1.md`).
- **More compiled coverage:** 23 plans were compiled in the final run and 3 promoted; more shadow traffic promotes more of them.
- **A first customer workload:** test on one team's recurring agent task against their current setup (`VALIDATION.md`).

## Team

- **Touko Ursin:** support agent, Memorable, GBrain, QM fork, Shopify store, replay and evaluation.
- **Marc Smeds:** River router (data, training, evaluation, serving), design system, customer validation.
