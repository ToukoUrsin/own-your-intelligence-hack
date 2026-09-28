# Support agent

Claude Opus 5 (Anthropic SDK, `SUPPORT_MODEL`) + company knowledge in GBrain + shop tools (local mock for replay, Shopify with `SHOP_BACKEND=shopify`). Every ticket returns a trace (tool steps, time, tokens) for Memorable and the counters.

```bash
# once: install GBrain (github:garrytan/gbrain via clone + bun link), then from repo root:
GBRAIN_HOME=$PWD/.brain-home gbrain init --pglite --no-embedding
GBRAIN_HOME=$PWD/.brain-home gbrain import brain/ --no-embed
cd agent && bun install
ANTHROPIC_API_KEY=... bun run src/cli.ts "where is my refund? crystalm392@example.com"
```
Knowledge base: `../brain/` (Northwind Outfitters, built from ABCD). Shop data: `../data/shop.json` via `src/shop.ts`; Shopify backend in `src/shopify.ts`. Router client, reuse gate and path memory: `src/memory.ts`; compiled plans: `src/compiled.ts`.
