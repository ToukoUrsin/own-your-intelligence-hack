# Build plan (14:05 → 17:00)

Scope (Touko, 14:05): the "24-hour" version minus evaluation/safety, humans-in-QM and self-repairing paths.

1. **Real data.** Public customer-support dataset (Bitext customer-support, Hugging Face) → knowledge base in GBrain + a stream of real ticket texts. Shop tools stay a local mock seeded to match the dataset.
2. **Learning curve.** Replay a few hundred real tickets in order; cost, time and tool calls per ticket fall as Memorable's path library grows.
3. **River (Marc).** (a) Router: messy ticket → standardized request, beats the base model on path hit rate. (b) Distillation: frequently replayed paths run on a small River model without Claude.
4. **QM as the chat.** Local QM fork (web) is where the user messages the agent; GBrain + shop tools via MCP; Memorable as memory provider; fork adds a dashboard panel (path recalled/explored, steps, time, cost, learning curve).
5. **Pitch.** 2-minute video, one-line business model (price per resolved ticket).

All local on Touko's Mac. Freeze features 16:00; video + public repos + submission 16:00–17:00.

| Workstream | Directory | Owner |
|---|---|---|
| QM fork running locally | `../qm` | agent |
| Real data → brain + tickets + shop fixtures | `data/`, `brain/`, `agent/src/shop.ts` | agent |
| MCP server for shop tools (+ gbrain serve) wired into QM | `mcp/` | agent |
| Memorable save/recall + replay harness + learning curve | `agent/`, `replay/` | agent (needs Memorable key) |
| River router + distillation, HTTP endpoint | Marc's choice | Marc |
| QM dashboard panel | `../qm` fork | agent, after QM runs |
