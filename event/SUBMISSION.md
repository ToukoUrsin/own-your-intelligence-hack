# Submission form (Google Form, due 17:00)

Fields: Email (touko.ursin@gmail.com, recorded) · Team Name* · Member Names + Emails* · Project Description* · Github URL* · Demo Video URL* · Side Quests · Anything else.
All links must be public before submitting.

## Team Name
Support AGI

## Member Names + Emails
Touko Ursin (touko.ursin@gmail.com), Marc Smeds (alexsmeds123@gmail.com)

## Project Description
Support that compiles itself. Our support agent handles each ticket on the cheapest route that works. A new kind of request is explored: Claude solves it with company knowledge in GBrain and the shop's tools, and Memorable extracts the path. Similar requests, standardized into a fixed request structure (River-trained router), recall that path and replay it in fewer steps. A path reused successfully three times compiles into a deterministic plan with guards from GBrain policy that answers with zero model calls; anything it cannot handle falls back to the agent. Customers chat in our QM fork, whose Paths panel shows the tier, steps, time and cost of every turn. On 400 ABCD support tickets, cost per ticket fell from $0.139 to $0.047 (−66%; $0.183 without memory), with 88% of late tickets recalled and 12% compiled. Judged answer quality matches the no-memory agent; exact human-workflow match stays low for every setup.

## Github URL
https://github.com/ToukoUrsin/own-your-intelligence-hack

## Demo Video URL
TBD (add before submitting)

## Side Quests
River AI, GBrain, Memorable, QM

## Anything else
- Real vs simulated: Claude agent, GBrain, Memorable, QM fork and a Shopify dev store (test orders, no real customers) are real. The 400-ticket replay uses a local mock of the same shop data for speed. Tickets and human-agent action sequences come from ABCD (ASAPP Research, MIT); 27 of our 42 hard tickets are constructed by us and labeled. Marc's River-trained router (Qwen3.6-35B-A3B LoRA, step 50, ~$1.35 training) routed the final run: 65% held-out path hit vs 56% Haiku and 8% raw text in our harness, 77% label accuracy in his eval. A confidence gate (≥0.7, single request) halves wrong reuse on hard tickets (48% → 24%). Storefront chat on the Shopify dev store; password on request.
- Built during hacking hours: first code commit 13:56, setup and docs from 13:00. No prior code reused. Timeline in the README.
- QM fork (per QM's side quest): https://github.com/ToukoUrsin/qm-support-agi (Paths panel, Memorable provider fix, support bot setup).
- An earlier design-system commit (14:45) was reverted at 14:49.
