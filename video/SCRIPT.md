# Video script: Support AGI (target ~2:00, hard limit 2:20)

A walkthrough of the real UI: QM chat + Paths panel + Shopify admin. No slides. Touko records with macOS Cmd+Shift+5
(full screen, own voice). Ticket texts and expected results: `video/DEMO_TICKETS.md`. Graphs: `video/graphs/*.png`
(rebuild with `uv run --with matplotlib video/make_graphs.py` after the final run).

## Tabs to have open (one Chrome window, left to right)
1. **QM chat A**: http://localhost:8084, new chat, Paths panel open.
2. **QM chat B**: http://localhost:8084, second new chat.
3. **QM chat C** (compiled ticket): third new chat.
4. **Learning curve**: http://localhost:8084/?paths&run=label-run (switch to `run=` of the final run once it is complete).
5. **Shopify admin**: Orders → order 3609246296 (ticket A), ready to refresh.
6. (Optional flash) `video/graphs/cost-per-ticket.png` in Preview, full screen.

Fallback for the compiled shot: a Terminal window at the repo root, font ~20 pt, cleared, with `video/compiled-demo.sh` typed.

## Pre-recording checklist
- [ ] `mcp/demo.sh` run just now (prints health OK). It resets the path store so ticket A explores.
- [ ] Ticket A/B orders still unrefunded in Shopify (see caveat in DEMO_TICKETS.md). If refunded, use the retake tickets below.
- [ ] Fresh chats in tabs 1–3, no leftover messages; Paths panel visible.
- [ ] Browser zoom 125% on QM tabs; bookmarks bar hidden (Cmd+Shift+B); no other tabs; Chrome full screen (Ctrl+Cmd+F).
- [ ] Do Not Disturb on; quit Slack, Mail, Messages.
- [ ] Mic check: record 5 s with Cmd+Shift+5 → Options → correct microphone, play it back.
- [ ] Dry run: `video/compiled-demo.sh` prints COMPILED (0 model calls).
- [ ] Ticket texts in a note, ready to copy: A, B, B follow-up, compiled.

## Shot list

| # | Time | Screen and clicks | Say |
|---|---|---|---|
| 1 | 0:00–0:15 | Tab 1 (QM chat A, empty), Paths panel visible. Slowly point at the chat, then the panel. | "We're Support AGI. This is a support agent for an online clothing shop. Every ticket takes the cheapest route that works: the agent explores new problems, recalls paths it has learned, and runs the most reused ones as compiled code with no model at all." |
| 2 | 0:15–0:40 | Paste ticket A (Norman, Gale jeans), Enter. While it runs, point at the Paths panel tool calls. Wait for **EXPLORED + saved new path**. | "A customer wants jeans removed from an order. River turns the message into a standardized request. No saved path yet, so the agent explores: account, policy in GBrain, shipping status, refund. When it's done, Memorable saves the path." |
| 3 | 0:40–0:50 | Tab 5 (Shopify admin), Cmd+R on order 3609246296, point at the $54 refund. | "And that's a real fifty-four dollar refund in Shopify." |
| 4 | 0:50–1:15 | Tab 2, paste ticket B (Joseph, two jackets), Enter. Panel: **RECALLED PATH**, point at the matched path and the lower call count and cost. Paste "The Harbor jacket please", Enter. | "Different customer, different words, same task. This time the path is recalled: the agent follows the steps it learned, no policy search, fewer calls, and a fraction of the cost." |
| 5 | 1:15–1:35 | Tab 3, **new chat**, paste the compiled ticket (Crystal, refund status), Enter. Reply lands in ~1 s; Paths panel: **COMPILED**, `plan-refund-status`, 0 ms-ish, $0.00, **0 model calls**, 3 steps all ✓; click "Compiled program" to open the plan JSON. *Backup only if QM misbehaves:* Terminal `video/compiled-demo.sh`. | "Refund status is one we've seen forty-six times, so it compiled into a plan: look up the account, find the refund, check the guards, fill in the reply. Zero model calls. If any check fails, the ticket goes back to the agent." |
| 6 | 1:35–1:50 | Tab 4 (learning curve). Hover over the first and last buckets. (Optional: flash `cost-per-ticket.png` for 3 s.) | "Across four hundred real support tickets, exploring drops from three quarters of tickets to almost none, and cost per ticket goes down as it learns." |
| 7 | 1:50–2:00 | Back to tab 1 (the finished explored chat), hold still. | "The agent's attention goes to the tickets that need it. The code is on GitHub." |

Read numbers off the screen as they are on the day; if the final run changes them, say what the panel shows.

## Compiled ticket (T0003, read-only, plan-refund-status, needs only `email`)
```
From: crystalm392@example.com
I am looking for the status of my refund. Crystal Minh
```
Expected: pull_up_account → get_refunds → validate_purchase; reply "refund for order 7168705674 (Mercer boots, $74) … **processing** … credit card"; 0 model calls. The order is in the Shopify map; the processing refund comes from the fixture.

Note (15:30): QM now runs the compiled tier in chat. With `COMPILED_ROUTES=1` (default in `hack/up.sh`), each user message is first POSTed to the MCP `/try_compiled` (rule match, then the River/Haiku normalizer); a promoted plan answers without the model and the turn is recorded as recall_path + plan steps. Anything else goes to the agent as before. Turn off: `COMPILED_ROUTES=0 hack/up.sh`. Needs the MCP restarted after 15:25 (`mcp/demo.sh`, which also picks up River on :8789).

## Retake notes
- **A/B already refunded**: use T0123 (sanyaafzal812@example.com, Kline jeans $69) and T0293 (normanbouc398@example.com, Mercer boots $54) once seeded in `data/shopify-map.json`; rerun `mcp/demo.sh` before each take so A explores again.
- **A recalls instead of exploring**: `mcp/demo.sh` wasn't rerun; rerun, new chat.
- **Compiled backups** (same plan, one refund each, checked with `compiled-demo.sh`):
  - T0053 `crystalm123@example.com`: "I was getting a refund on my order and I just want to check on the status of it. Crystal Minh"
  - T0038 `sanyaafzal525@example.com`: "Hey, can I check on the status of my refund? Thanks! Sanya Afzal"
  - Terminal: `video/compiled-demo.sh <email> "<message>"`
- **Show a fallback** (optional, +8 s): `video/compiled-demo.sh ap339985@example.com "where is my refund"` prints `FALLBACK to agent: exactly one refund on the order`. Say: "No refund on that order, so the plan refuses and the agent takes over."
- **Over time**: cut shot 3 to 5 s and drop the graph flash.
- **Stumble**: pause 2 s, repeat the line, trim in QuickTime (Edit → Split / Trim).
