# Support AGI — support that compiles itself

Team **Support AGI**: Touko Ursin, Marc Smeds · Own Your Intelligence Hackathon, YC San Francisco, 27 September 2026.

A customer-support agent that gets cheaper the more tickets it handles. The first time a kind of request arrives, the agent solves it from scratch with company knowledge from GBrain and the shop's tools, and Memorable stores the path it took. The next similar request is standardized into a fixed request structure and recalls that path, so the agent replays it in a few steps. Once a path has been reused successfully enough times, it compiles into a deterministic plan that runs with **zero model calls**. Anything a plan's guards cannot handle falls back to the agent. Not every ticket compiles; the system compiles what it safely can.

## Three tiers

![Architecture: River routes each ticket to compiled, recalled or explored](video/graphs/architecture.png)

```mermaid
flowchart LR
    T[Customer ticket] --> N[Request normalizer<br/>CANONICAL_REQUEST_V1]
    N --> P{Compiled plan<br/>for this request?}
    P -- yes, guards pass --> C[Compiled<br/>JSON plan, 0 model calls]
    P -- no / guard fails --> M{Memorable recall<br/>finds a path?}
    M -- yes --> R[Recalled<br/>agent replays the path]
    M -- no --> E[Explored<br/>agent solves from scratch]
    E -- path extracted --> S[(Memorable<br/>procedures)]
    R -- successful reuse --> S
    S -- reused ≥3 times, validated offline --> K[(Compiled plans)]
    K --> P
```

| Tier | What runs | Model calls |
|---|---|---|
| Explored | Claude agent + GBrain + shop tools, no prior path | Full agent loop |
| Recalled | Claude agent follows a procedure recalled from Memorable | Fewer steps |
| Compiled | JSON program: bindings from the canonical request, tool calls, guards from GBrain policy, reply template | None |

Compiled plans are promoted in shadow first: a plan is checked against the agent's own result on real tickets before it is allowed to answer.

## How each host is used

- **GBrain** — the company brain: 71 pages (55 procedures from ABCD agent guidelines, policies, catalog, FAQ). The agent searches it on every explored ticket, and compiled plans take their guards from its policies. `brain/`, `agent/src/brain.ts`.
- **QM** — the harness customers chat in. Our fork ([ToukoUrsin/qm-support-agi](https://github.com/ToukoUrsin/qm-support-agi), branch `support-agi`) runs the support bot with our tools over MCP (`mcp/`), adds a **Paths panel** (recalled vs explored per turn, steps, time, cost, learning curve) and fixes QM's Memorable provider, which was never consulted on chat turns.
- **Memorable** — procedure extraction (`/v1/extract`), storage and recall (`agent/src/memorable-store.ts`, `RECALL_BACKEND=memorable`). Successful agent traces become procedures; later tickets recall them.
- **River AI** — the request normalizer: messy ticket in, `CANONICAL_REQUEST_V1` out (`CANONICAL_REQUEST_V1.md`), which is what recall and compiled plans match on. Marc trained a LoRA on Qwen3.6-35B-A3B with the River API on 8,316 ABCD openings (step 50, about $1.35 of training tokens, estimate). The final run routed 398 of 400 tickets through it (`ROUTER_URL`); a Claude Haiku stand-in (`agent/src/canonical.ts`) remains the fallback.
  - River results: **65%** held-out path hit rate in our recall harness vs **56%** for Haiku and **8%** for raw ticket text; **77%** label accuracy in Marc's own eval (`router/REPORT.md`).

## Data

- **ABCD** (Action-Based Conversations Dataset, ASAPP Research, MIT): human-to-human support conversations for an online clothing retailer, each with the **action sequence the human agent took**. We use 400 tickets for replay and 100 held out for evaluation, and score our agent's tool calls against the human actions. See `DATASET.md`.
- **Shopify dev store** "Northwind Outfitters": 16 products (Unsplash photos, `data/PHOTO_CREDITS.md`) and test orders seeded from the ABCD customers (`data/seed_shopify.ts`). The live QM demo runs against it.
- **Hard tickets** (`data/HARD_TICKETS.md`): 42 tickets from the long tail — 15 real ABCD conversations (longest, changed requests, rarest intents) and 27 constructed edge cases (multiple requests, missing identifiers, contradictions, policy edges, angry customers, must-escalate, non-English, typos). They should stay with the full agent, not a cheap path.

## Results

Final cold-start run: 400 ABCD tickets in order plus 42 hard tickets interleaved, River router, Memorable, mock shop, 25-ticket buckets.

![Cost per ticket falls as paths are learned](video/graphs/cost-per-ticket.png)
![Tier share per bucket](video/graphs/tier-share.png)

| Metric | Value |
|---|---|
| Cost per ticket, first 25 → last 25 | **$0.139 → $0.047 (−66%)** |
| Cost per ticket, no-memory baseline | $0.183 |
| Tier share, last 25 (explored / recalled / compiled) | 0% / 88% / 12% |
| Cost per ticket by tier | explored $0.191 · recalled $0.059 · compiled ~$0.0003 (router only, 0 model calls) |
| Compiled-plan accuracy | 94% (33 of 35) reply agreement with the agent in the offline Haiku-judged eval (`compiled-eval.json`); in the final run plans answer only after 2 of 3 shadow agreements |
| Router path hit rate, 100 held-out tickets | River 65% · Haiku 56% · raw text 8% |
| Hard tickets (42), tier they ended in | 8 explored · 33 recalled · 1 compiled; 20 recalls used the wrong subflow |
| Confidence gate (≥0.7, single request) on hard tickets | wrong-procedure reuse 48% → **24%**, cost still below baseline ($0.104 vs $0.223) |
| Answer quality (Haiku judge, "resolved per policy") | on par with the no-memory agent: hard 40% gated vs 38% baseline, normal 29% vs 26% |

![Hard vs normal tickets](video/graphs/hard-vs-normal.png)

**Where quality is not proven.** Exact match with the human agent's action set is low for every setup: 13% for recalled paths, 23% for explored, 27% for the no-memory baseline (52% for compiled plans on their narrow intents). The judge sees the ticket, reply, policy and human actions but not the shop database, so its absolute rates are only comparable within the table. Even gated, 24% of hard tickets reuse the wrong procedure. Details: `replay/SUMMARY.md`.

Raw outputs: `replay/summary.json`, `replay/summary-baseline.json`, `replay/gate-check.json`, `replay/compiled-eval.json`, `replay/router-eval.json`, `router/REPORT.md`.

## Try it

- **QM fork** with the Paths panel: [ToukoUrsin/qm-support-agi](https://github.com/ToukoUrsin/qm-support-agi) (branch `support-agi`).
- **Storefront chat** (`storefront/`): a chat bubble on the Shopify dev store [kettle-and-co-support-hack.myshopify.com](https://kettle-and-co-support-hack.myshopify.com), same pipeline. The store is password-protected; the password is given on request.

## Next steps

- Marc's gate suggestion: create paths only at ≥0.8 router confidence and reuse at ≥0.5 (simulated only so far).
- The canonical-v1 normalizer on River (operation, subject, topic, not just the subflow label), so plans match on structure.
- Opus 5.5 for the explored tier, and a per-procedure check that a recalled path's first lookups fit the ticket before replay.

## What's real vs simulated

- **Real:** the Claude agent, GBrain, Memorable API calls, the QM fork, the Shopify dev store and its API calls, ABCD conversations and human action sequences, all measured costs and times.
- **Test data:** the Shopify store is a development store with test orders; no real customers or payments.
- **Mock shop for replay:** the 400-ticket replay uses a local mock of the same shop data (`agent/src/shop.ts`) so it can run fast and repeatably; the live demo uses Shopify.
- **Constructed:** 27 of the 42 hard tickets were written by us and are labeled `source: "constructed"`.
- **Router:** the final run used Marc's River-trained router (served from his Mac); the Haiku stand-in is used only as a fallback and in the earlier compiled-plan eval.
- **Offline validation:** compiled-plan accuracy is judged by Claude Haiku comparing the compiled reply with the agent's reply on the same ticket.

## Built today

All code was written during hacking hours (13:15–17:00 PDT). No prior projects or code were reused. The only fork is QM, which QM's side quest invites.

| Time (PDT) | Commit |
|---|---|
| 13:00–13:40 | Setup and docs: hackathon brief, rules, notes |
| 13:56 | Core idea; first code: support agent on GBrain with shop tools and step traces |
| 14:12–14:27 | Real support data; Memorable layer and replay harness; MCP server for QM; Shopify backend; switch to ABCD |
| 14:31–14:49 | Northwind Outfitters brain, catalog and seeding; QM MCP tools on Shopify; Memorable-backed procedure store |
| 14:54 | Canonical request v1 normalizer (Haiku stand-in for River) |
| 14:56 | Compiled paths: reused procedures become deterministic JSON plans |
| 15:05 | Shadow promotion for compiled plans |
| 15:12 | 42 hard tickets |

Full history: `git log`. QM fork commits: Paths panel, Memorable provider fix, Northwind support soul.

## Run

```bash
# GBrain with the company brain
GBRAIN_HOME=$PWD/.brain-home gbrain init --pglite --no-embedding
GBRAIN_HOME=$PWD/.brain-home gbrain import brain/ --no-embed

# One ticket through the agent
cd agent && bun install
ANTHROPIC_API_KEY=... bun run src/cli.ts "where is my order? jane@example.com"

# Replay the learning curve (mock shop); NORMALIZER=haiku or ROUTER_URL=<River endpoint>
bun ../replay/run.ts --n 400 --bucket 25
bun ../replay/compile_eval.ts     # compile, validate and simulate the three tiers
bun ../replay/eval_router.ts      # router hit rate on held-out tickets

# MCP server for QM (Shopify backend)
../mcp/start.sh
```

Keys: `ANTHROPIC_API_KEY`, `MEMORABLE_API_KEY`, `SHOPIFY_ADMIN_TOKEN`.

## Repository

Our thinking along the way: [Codex and Claude Code conversations](jorney/README.md).

`agent/` support agent, normalizer, memory, compiled plans · `mcp/` tools for QM · `replay/` replay, evals, plans · `brain/` GBrain pages · `data/` ABCD splits, hard tickets, Shopify seeder · `event/` rules and submission · `IDEA.md`, `CANONICAL_REQUEST_V1.md` design.
