#!/usr/bin/env bash
# Video demo: restart the MCP on a copy of the replay's procedure store without the demo subflow (default manage_cancel),
# so ticket A explores and saves a path and ticket B recalls it (see video/DEMO_TICKETS.md). Rerun to reset.
# Same memory.ts code path and all other learned procedures; only the store file differs (MEMORY_STORE).
set -euo pipefail
cd "$(dirname "$0")"
INTENT="${1:-manage_cancel}"
SRC=../replay/procedures.jsonl DEMO=../replay/demo-procedures.jsonl
python3 - "$INTENT" "$SRC" "$DEMO" <<'PY'
import json, sys
intent, src, dst = sys.argv[1:]
rows = [json.loads(l) for l in open(src) if l.strip()]
keep = [r for r in rows if r.get("intent") != intent]
open(dst, "w").write("".join(json.dumps(r) + "\n" for r in keep))
print(f"demo store: {len(keep)} of {len(rows)} procedures (without {intent})")
PY
# Marc's River router standardizes live tickets when it is up locally (override with ROUTER_URL=, empty = Haiku stand-in).
if [ -z "${ROUTER_URL+x}" ] && lsof -ti tcp:8789 -sTCP:LISTEN >/dev/null; then export ROUTER_URL=http://127.0.0.1:8789/route; fi
echo "normalizer: ${ROUTER_URL:-haiku stand-in}"
lsof -ti tcp:8790 -sTCP:LISTEN | xargs kill 2>/dev/null || true
sleep 1
MEMORY_STORE="$(cd .. && pwd)/replay/demo-procedures.jsonl" nohup ./start.sh > logs/server.log 2>&1 &
for i in $(seq 1 40); do curl -sf localhost:8790/health >/dev/null && break; sleep 1; done
curl -s localhost:8790/health; echo
