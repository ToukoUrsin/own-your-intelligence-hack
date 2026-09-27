# Support agent

Claude (Anthropic SDK) + company knowledge in GBrain + mock shop tools. Every ticket returns a trace (tool steps, time, tokens) for Memorable and the counters.

```bash
# once: install GBrain (github:garrytan/gbrain via clone + bun link), then from repo root:
GBRAIN_HOME=$PWD/.brain-home gbrain init --pglite --no-embedding
GBRAIN_HOME=$PWD/.brain-home gbrain import brain/ --no-embed
cd agent && bun install
ANTHROPIC_API_KEY=... bun run src/cli.ts "my kettle screen is blank, dev.patel@example.com"
```
Knowledge base: `../brain/` (synthetic company Kettle & Co). Shop data: `src/shop.ts` (synthetic).
