"""Static graphs for the README and video from the replay run.

Reads replay/results.jsonl (falls back to replay/label-run/results.jsonl when the final run is empty or missing)
and replay/baseline.jsonl. Writes video/graphs/*.png.

    uv run --with matplotlib video/make_graphs.py [--bucket 25] [--run replay/label-run]
"""
import argparse
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "video" / "graphs"
TIERS = ["explored", "recalled", "compiled"]
COLOR = {"explored": "#E8833A", "recalled": "#3D7FD9", "compiled": "#2FA56B", "baseline": "#8A8F98"}

plt.rcParams.update({
    "font.size": 16, "axes.titlesize": 22, "axes.titleweight": "bold", "axes.labelsize": 17,
    "xtick.labelsize": 14, "ytick.labelsize": 14, "legend.fontsize": 15, "axes.spines.top": False,
    "axes.spines.right": False, "axes.titlepad": 16, "figure.dpi": 100, "savefig.dpi": 150,
})


def jsonl(p: Path):
    if not p.exists():
        return []
    return [json.loads(l) for l in p.read_text().splitlines() if l.strip()]


def tier(r):
    t = r.get("tier")
    if t in TIERS:
        return t
    return "recalled" if r.get("recalled") else "explored"


def load(run: str | None):
    for d in ([ROOT / run] if run else []) + [ROOT / "replay", ROOT / "replay/label-run"]:
        rows = [r for r in jsonl(d / "results.jsonl") if r.get("tier") != "error" and not r.get("error")]
        if rows:
            return rows, d.relative_to(ROOT)
    raise SystemExit("no results.jsonl with rows found")


def buckets(rows, size):
    rows = sorted(rows, key=lambda r: r.get("i", 0))
    return [rows[k:k + size] for k in range(0, len(rows), size)]


def label(b, k, size):
    return f"{k * size + 1}–{k * size + len(b)}"


def cost_by_tier(rows, size, base, src):
    bs = buckets(rows, size)
    x = list(range(len(bs)))
    fig, ax = plt.subplots(figsize=(12, 6.75))
    avg = [sum(r["cost"] for r in b) / len(b) for b in bs]
    ax.plot(x, avg, color="#222", lw=3.2, marker="o", ms=7, label="all tickets", zorder=5)
    for t in TIERS:
        ys = []
        for b in bs:
            c = [r["cost"] for r in b if tier(r) == t]
            ys.append(sum(c) / len(c) if c else None)
        if any(v is not None for v in ys):
            pts = [(i, v) for i, v in zip(x, ys) if v is not None]
            ax.plot(*zip(*pts), color=COLOR[t], lw=2.2, marker="o", ms=5, alpha=.9, label=t)
    if base:
        ax.axhline(base, color=COLOR["baseline"], ls="--", lw=2, label=f"agent without memory (${base:.3f})")
    ax.set_xticks(x, [label(b, k, size) for k, b in enumerate(bs)], rotation=45, ha="right")
    ax.set_ylim(bottom=0)
    ax.yaxis.set_major_formatter(lambda v, _: f"${v:.2f}")
    ax.set_xlabel("tickets, in arrival order")
    ax.set_ylabel("cost per ticket")
    ax.set_title("Cost per ticket over the run, by route")
    ax.legend(frameon=False, loc="upper right")
    ax.grid(axis="y", alpha=.25)
    fig.text(.01, .01, f"source: {src}/results.jsonl · {len(rows)} ABCD tickets", fontsize=11, color="#777")
    fig.tight_layout(rect=(0, .03, 1, 1))
    fig.savefig(OUT / "cost-per-ticket.png")
    plt.close(fig)


def tier_share(rows, size, src):
    bs = buckets(rows, size)
    x = list(range(len(bs)))
    fig, ax = plt.subplots(figsize=(12, 6.75))
    bottom = [0.0] * len(bs)
    for t in TIERS:
        ys = [sum(tier(r) == t for r in b) / len(b) for b in bs]
        if not any(ys):
            continue
        ax.bar(x, ys, bottom=bottom, color=COLOR[t], width=.82, label=t)
        bottom = [a + b for a, b in zip(bottom, ys)]
    ax.set_xticks(x, [label(b, k, size) for k, b in enumerate(bs)], rotation=45, ha="right")
    ax.set_ylim(0, 1)
    ax.yaxis.set_major_formatter(lambda v, _: f"{v:.0%}")
    ax.set_xlabel("tickets, in arrival order")
    ax.set_ylabel("share of tickets")
    ax.set_title("Which route each ticket took")
    ax.legend(frameon=False, loc="upper center", bbox_to_anchor=(.5, -.28), ncol=3)
    fig.text(.01, .01, f"source: {src}/results.jsonl", fontsize=11, color="#777")
    fig.tight_layout(rect=(0, .03, 1, 1))
    fig.savefig(OUT / "tier-share.png")
    plt.close(fig)


def hard_vs_normal(rows, src):
    hard = [r for r in rows if r.get("hard")]
    if not hard:
        print("hard-vs-normal: no hard tickets in this run, skipped")
        return False
    normal = [r for r in rows if not r.get("hard")]
    groups = [("normal tickets", normal), ("hard tickets", hard)]
    fig, ax = plt.subplots(figsize=(12, 5.5))
    for y, (name, g) in enumerate(groups):
        left = 0.0
        for t in TIERS:
            v = sum(tier(r) == t for r in g) / len(g)
            if v:
                ax.barh(y, v, left=left, color=COLOR[t], height=.6, label=t if y == 0 else None)
                if v >= .07:
                    ax.text(left + v / 2, y, f"{v:.0%}", ha="center", va="center", color="white", fontsize=15, fontweight="bold")
                left += v
    ax.set_yticks([0, 1], [f"{n}\n(n={len(g)})" for n, g in groups])
    ax.invert_yaxis()
    ax.set_xlim(0, 1)
    ax.xaxis.set_major_formatter(lambda v, _: f"{v:.0%}")
    ax.set_title("Route taken: hard vs normal tickets")
    handles, labels = ax.get_legend_handles_labels()
    for t in TIERS:  # legend entries for tiers only present in the hard row
        if t not in labels and any(tier(r) == t for r in hard):
            handles.append(plt.Rectangle((0, 0), 1, 1, color=COLOR[t]))
            labels.append(t)
    ax.legend(handles, labels, frameon=False, loc="upper center", bbox_to_anchor=(.5, -.12), ncol=3)
    fig.text(.01, .01, f"source: {src}/results.jsonl · hard tickets from data/hard_tickets.jsonl", fontsize=11, color="#777")
    fig.tight_layout(rect=(0, .03, 1, 1))
    fig.savefig(OUT / "hard-vs-normal.png")
    plt.close(fig)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bucket", type=int, default=25)
    ap.add_argument("--run", help="run directory with results.jsonl, relative to repo root")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    rows, src = load(a.run)
    b = jsonl(ROOT / "replay/baseline.jsonl")
    base = sum(r["cost"] for r in b) / len(b) if b else None
    cost_by_tier(rows, a.bucket, base, src)
    tier_share(rows, a.bucket, src)
    hard_vs_normal(rows, src)
    print(f"{len(rows)} tickets from {src} → {OUT.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
