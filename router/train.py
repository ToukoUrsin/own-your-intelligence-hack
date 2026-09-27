# LoRA SFT of the subflow router on River, with base-model baseline and checkpoint evals on
# data/heldout.jsonl (100, ABCD test) and router/data/val.jsonl (300, ABCD dev).
# Writes runs/<run>/report.json after every step. Run: .venv/bin/python train.py --run r1
import argparse, json, os, random, time
from pathlib import Path
from common import BASE, HERE, ROOT, TAGS, classify, client, messages, read_jsonl, renderer

ap = argparse.ArgumentParser()
ap.add_argument("--run", required=True)
ap.add_argument("--steps", type=int, default=100)
ap.add_argument("--batch", type=int, default=64)
ap.add_argument("--lr", type=float, default=2e-4)
ap.add_argument("--rank", type=int, default=16)
ap.add_argument("--eval-at", default="20,50,100")
ap.add_argument("--max-minutes", type=float, default=25)
ap.add_argument("--no-baseline", action="store_true")
ap.add_argument("--balance", type=float, default=0, help="sample label with p ~ count^(1-balance); 0 = natural, 1 = uniform")
ap.add_argument("--decay", type=float, default=0, help="linear LR decay to lr*(1-decay) at the last step")
args = ap.parse_args()

import river_client as river
from river_client.renderers import TrainOnWhat

out = HERE / "runs" / args.run
out.mkdir(parents=True, exist_ok=True)
report = {"run": args.run, "base_model": BASE, "config": vars(args), "steps": [], "evals": {}}
def save():
    tmp = out / "report.json.tmp"
    tmp.write_text(json.dumps(report, indent=1, ensure_ascii=False)); os.replace(tmp, out / "report.json")

rend = renderer()
train = read_jsonl(HERE / "data/train.jsonl")
sets = {"heldout": read_jsonl(ROOT / "data/heldout.jsonl"), "val": read_jsonl(HERE / "data/val.jsonl")}
datums = [rend.build_training_example(messages(r["text"], r["intent"]), train_on=TrainOnWhat.LAST_ASSISTANT).to_dict() for r in train]
report["train_examples"], report["mean_tokens"] = len(datums), round(sum(len(d["weights"]) for d in datums) / len(datums), 1)


def evaluate(session, name, checkpoint=None):
    t0 = time.monotonic()
    res = {}
    for set_name, rows in sets.items():
        preds = classify(session, rend, [r["text"] for r in rows], checkpoint=checkpoint)
        hits = sum(p["intent"] == r["intent"] for p, r in zip(preds, rows))
        res[set_name] = {"n": len(rows), "accuracy": round(hits / len(rows), 3),
                         "none": sum(p["intent"] == "none" for p in preds),
                         "rows": [{"id": r.get("id", r.get("convo_id")), "gold": r["intent"], **p} for p, r in zip(preds, rows)]}
    res["seconds"] = round(time.monotonic() - t0, 1)
    report["evals"][name] = res
    save()
    print(f"[eval {name}] heldout={res['heldout']['accuracy']} val={res['val']['accuracy']} ({res['seconds']}s)", flush=True)


c = client()
try:
    with c.session(**TAGS, role=f"train-{args.run}") as session:
        if not args.no_baseline:
            evaluate(session, "base")
        model = session.create_model(BASE, lora=river.LoraConfig(rank=args.rank, seed=1337))
        eval_at = {int(x) for x in args.eval_at.split(",")}
        start, tokens = time.monotonic(), 0
        rng = random.Random(1337)
        by_label = {}
        for i, r in enumerate(train): by_label.setdefault(r["intent"], []).append(i)
        labels = sorted(by_label)
        lw = [len(by_label[l]) ** (1 - args.balance) for l in labels]
        order = list(range(len(datums))); rng.shuffle(order)
        for step in range(1, args.steps + 1):
            if args.balance:
                batch = [datums[rng.choice(by_label[l])] for l in rng.choices(labels, weights=lw, k=args.batch)]
            else:
                if len(order) < args.batch: order = list(range(len(datums))); rng.shuffle(order)
                batch = [datums[order.pop()] for _ in range(args.batch)]
            lr = args.lr * (1 - args.decay * (step - 1) / max(1, args.steps - 1))
            t0 = time.monotonic()
            fb, opt = model.train_step(batch, lr=lr, loss_fn="cross_entropy", grad_clip_norm=1.0)
            tokens += sum(len(d["weights"]) for d in batch)
            report["steps"].append({"step": step, "lr": lr, "seconds": round(time.monotonic() - t0, 2),
                                    "fb": fb.metrics, "opt": opt.metrics, "train_tokens": tokens})
            report["train_tokens"], report["est_train_usd"] = tokens, round(tokens / 1e6 * 1.0, 3)
            save()
            print(f"step {step} {report['steps'][-1]['seconds']}s {fb.metrics}", flush=True)
            over = (time.monotonic() - start) / 60 > args.max_minutes
            if step in eval_at or step == args.steps or over:
                ckpt = model.save_weights(f"claude-router-{args.run}-step{step}", mode="inference")
                report.setdefault("checkpoints", {})[str(step)] = {"path": ckpt.path, "step": ckpt.step, "checkpoint_type": ckpt.checkpoint_type}
                save()
                evaluate(session, f"step{step}", checkpoint=ckpt)
            if over:
                report["stopped"] = f"time limit after step {step}"; save(); break
finally:
    c.close()
print("done", flush=True)
