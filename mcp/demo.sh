#!/usr/bin/env bash
# Video demo: restart the MCP on a copy of the replay's procedure store without the demo subflow (default manage_cancel),
# so ticket A explores and saves a path and ticket B recalls it (see video/DEMO_TICKETS.md). Rerun to reset.
# Same memory.ts code path and all other learned procedures; only the store file differs (MEMORY_STORE).
set -euo pipefail
# Source = the finished label-run store (stable); replay/procedures.jsonl is rewritten while a replay runs.
cd "$(dirname "$0")"
INTENT="${1:-manage_cancel}"
SRC=${DEMO_SRC:-../replay/label-run/procedures.jsonl} DEMO=../replay/demo-procedures.jsonl
python3 - "$INTENT" "$SRC" "$DEMO" <<'PY'
import json, sys
intent, src, dst = sys.argv[1:]
rows = [json.loads(l) for l in open(src) if l.strip()]
keep = [r for r in rows if r.get("intent") != intent]
open(dst, "w").write("".join(json.dumps(r) + "\n" for r in keep))
print(f"demo store: {len(keep)} of {len(rows)} procedures (without {intent})")
PY
# Recall through Memorable itself (RECALL_BACKEND=memorable; local store stays the fallback if Memorable errors).
# The demo gets a copy of the project Memorable home whose slug map drops the demo subflow, so Memorable's hit for it
# resolves to nothing and ticket A explores; A's save_path then ingests into Memorable and B recalls it.
# MEMORABLE=0 mcp/demo.sh = local store only.
if [ "${MEMORABLE:-1}" = 1 ]; then
  rm -rf ../.memorable-home-demo && cp -R ../.memorable-home ../.memorable-home-demo
  python3 - "$INTENT" ../.memorable-home-demo/kettle-procedures.json <<'PY'
import json, sys
intent, path = sys.argv[1:]
m = json.load(open(path)); keep = {k: v for k, v in m.items() if v.get("intent") != intent}
json.dump(keep, open(path, "w"), indent=1); print(f"memorable demo map: {len(keep)} of {len(m)} (without {intent})")
PY
  export RECALL_BACKEND=memorable MEMORABLE_HOME="$(cd .. && pwd)/.memorable-home-demo"
fi
echo "recall backend: ${RECALL_BACKEND:-local}"
# Marc's River router standardizes live tickets when it is up locally (override with ROUTER_URL=, empty = Haiku stand-in).
if [ -z "${ROUTER_URL+x}" ] && lsof -ti tcp:8789 -sTCP:LISTEN >/dev/null; then export ROUTER_URL=http://127.0.0.1:8789/route; fi
echo "normalizer: ${ROUTER_URL:-haiku stand-in}"
lsof -ti tcp:8790 -sTCP:LISTEN | xargs kill 2>/dev/null || true
sleep 1
MEMORY_STORE="$(cd .. && pwd)/replay/demo-procedures.jsonl" nohup ./start.sh > logs/server.log 2>&1 &
for i in $(seq 1 40); do curl -sf localhost:8790/health >/dev/null && break; sleep 1; done
curl -s localhost:8790/health; echo
