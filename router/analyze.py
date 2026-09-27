# Key stability without Memorable: route the 400 replay tickets (data/tickets.jsonl, in replay order) and simulate
# an exact-key workflow library (first ticket of a key explores and saves; later tickets with that key reuse it).
# Also: confidence (entropy proxy) and a confidence-gate curve on val.
# Run: .venv/bin/python analyze.py r1:50 [r2:90 ...] [--base]
import json, math, sys
from common import BASE, HERE, ROOT, TAGS, classify, client, read_jsonl, renderer

import river_client as river
tickets = read_jsonl(ROOT / "data/tickets.jsonl")
rend = renderer()


def simulate(preds, gold, min_conf=0.0):
    lib, reuse, wrong, explored = {}, 0, 0, 0
    for p, g in zip(preds, gold):
        key = p["intent"] if p["intent"] != "none" and (p["confidence"] or 0) >= min_conf else None
        if key and key in lib:
            reuse += 1; wrong += lib[key] != g
        else:
            explored += 1
            if key: lib[key] = g  # new workflow filed under this key
    n = len(gold)
    pure = sum(1 for k, g in lib.items() if k == g)
    return {"min_conf": min_conf, "workflows": len(lib), "workflows_correct_key": pure, "explored": explored,
            "reuse_rate": round(reuse / n, 3), "correct_reuse_rate": round((reuse - wrong) / n, 3), "wrong_reuse_rate": round(wrong / n, 3)}


def stats(preds, rows):
    confs = [p["confidence"] or 0 for p in preds]
    return {"accuracy": round(sum(p["intent"] == r["intent"] for p, r in zip(preds, rows)) / len(rows), 3),
            "mean_confidence": round(sum(confs) / len(confs), 3),
            "mean_nll": round(sum(-math.log(max(c, 1e-9)) for c in confs) / len(confs), 3)}


def gate_curve(preds, rows):
    out = []
    for t in (0, 0.5, 0.7, 0.8, 0.9, 0.95):
        kept = [(p, r) for p, r in zip(preds, rows) if (p["confidence"] or 0) >= t]
        out.append({"min_conf": t, "coverage": round(len(kept) / len(rows), 3),
                    "accuracy_when_routed": round(sum(p["intent"] == r["intent"] for p, r in kept) / max(1, len(kept)), 3)})
    return out


targets = [a for a in sys.argv[1:] if not a.startswith("--")]
if "--base" in sys.argv: targets = ["base"] + targets
c = client()
try:
    with c.session(**TAGS, role="analyze") as session:
        for t in targets:
            ckpt = None
            if t != "base":
                run, step = t.split(":")
                ckpt = river.Checkpoint(**json.loads((HERE / "runs" / run / "report.json").read_text())["checkpoints"][step])
            val = read_jsonl(HERE / "data/val.jsonl")
            pt, pv = classify(session, rend, [x["text"] for x in tickets], checkpoint=ckpt), classify(session, rend, [x["text"] for x in val], checkpoint=ckpt)
            gold = [x["intent"] for x in tickets]
            res = {"target": t, "replay_tickets": {**stats(pt, tickets), "library": [simulate(pt, gold, m) for m in (0, 0.5, 0.8)]},
                   "val": {**stats(pv, val), "gate": gate_curve(pv, val)},
                   "rows": [{"id": x["id"], "gold": x["intent"], **p} for p, x in zip(pt, tickets)]}
            name = "base" if t == "base" else t.replace(":", "-step")
            (HERE / "runs" / f"analysis-{name}.json").write_text(json.dumps(res, indent=1))
            print(json.dumps({k: v for k, v in res.items() if k != "rows"}), flush=True)
finally:
    c.close()
