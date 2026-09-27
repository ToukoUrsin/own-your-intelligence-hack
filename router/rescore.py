# Re-score saved raw outputs in runs/<run>/report.json with the current parser (no API calls).
import json, sys
from common import HERE, parse
rep = json.loads((HERE / "runs" / sys.argv[1] / "report.json").read_text())
for name, ev in rep["evals"].items():
    line = [name]
    for s in ("heldout", "val"):
        rows = ev[s]["rows"]
        hits = sum(parse(r["raw"]) == r["gold"] for r in rows)
        line.append(f"{s}={hits / len(rows):.3f} (none {sum(parse(r['raw']) == 'none' for r in rows)})")
    print("  ".join(line))
