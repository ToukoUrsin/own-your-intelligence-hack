# Idea: support agent that gets cheaper with every ticket

A customer-support agent for a small company. The company's knowledge and customer history live in **GBrain**. When the agent solves a ticket, **Memorable** saves the path (the steps it took). The next time a similar question arrives, the agent replays the path instead of exploring from scratch. A small model trained with **River** standardizes messy customer requests ("yo my stuff never showed up") so they match the right saved path.

## Pieces
| Piece | Role | Owner |
|---|---|---|
| GBrain | Company knowledge base + customer history; the agent answers from it (mandatory host) | Touko |
| Support agent | Claude-powered agent with tools for a mock shop (orders, shipping, refunds) | Touko |
| Memorable | Save solved-ticket paths; recall and replay them for similar tickets | Touko |
| River | Fine-tuned small model: messy request → canonical request/path. Must be trained via the River API to qualify | Marc |
| Superset | Build with parallel agents; present with Superset Pages (Best Agent Swarm) | both |

## The demo we want
1. Ticket 1: agent explores from scratch (many tool calls, slow, costly). Memorable saves the path.
2. Ticket 2, same problem worded differently: River router maps it to the path, which replays in a few steps.
3. Live counter over many tickets: cost and time per ticket fall as the path library grows.
4. A ticket with no known path goes to a human; their fix becomes a new path.

## Proof River matters
Path hit rate on held-out, oddly worded tickets: raw text vs base model vs our trained router.

## Side quests
GBrain (tedious human problem) · Memorable (most memorable, specific domain) · River (best custom model) · Superset (best agent swarm).
