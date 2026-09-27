# ABCD train+dev openings -> router SFT data. Excludes the replay (tickets.jsonl) and held-out (heldout.jsonl)
# conversations; ABCD test is never used. Writes data/train.jsonl and data/val.jsonl (300 dev openings).
# Run: .venv/bin/python build_data.py
import gzip, json, random, re
from collections import Counter
from common import HERE, ROOT, LABELS, read_jsonl

RAW = ROOT / "data/abcd/raw"
BRANDS = {"michael kors": "Mercer", "calvin klein": "Kline", "tommy hilfiger": "Harbor"}
FAQ_FLOWS = {"single_item_query", "storewide_query"}


# Same rules as data/build.py (genericize, opening, label) so training text matches the tickets.
def genericize(t: str) -> str:
    t = re.sub(r"\b(michael[ _]kors|calvin[ _]klein|tommy[ _]hilfiger)\b", lambda m: BRANDS[m.group(1).lower().replace("_", " ")], t, flags=re.I)
    t = re.sub(r"\bguess(?=[ _-]*(jeans|shirts?|boots?|jackets?|brand)\b)", "Gale", t, flags=re.I)
    t = re.sub(r"\btommy\b", "Harbor", t, flags=re.I)
    return re.sub(r"\b([\w.+-]+)@[\w-]+\.(com|net|org)\b", lambda m: f"{m.group(1).lower()}@example.com", t)


def opening(convo) -> str:
    out = []
    for speaker, text in convo["original"]:
        if speaker == "action": break
        if speaker == "customer": out.append(text.strip())
        if len(out) == 3: break
    return genericize(" ".join(out))


def label(sc) -> str:
    flow, sub = sc["flow"], sc["subflow"]
    if flow in FAQ_FLOWS: sub = sub.split("_")[0]
    return {"status_questions": "status_active", "status_delivery_date": "status_delivery_time"}.get(sub, sub)


data = json.load(gzip.open(RAW / "abcd_v1.1.json.gz"))
tickets, heldout = read_jsonl(ROOT / "data/tickets.jsonl"), read_jsonl(ROOT / "data/heldout.jsonl")
excluded = {t["convo_id"] for t in tickets + heldout}
reserved = {t["text"].strip().lower() for t in tickets + heldout}

rows = {"train": [], "dev": []}
for split in rows:
    for c in data[split]:
        text, lab = opening(c), label(c["scenario"])
        if c["convo_id"] in excluded or not text or text.lower() in reserved: continue
        assert lab in LABELS, lab
        rows[split].append({"convo_id": c["convo_id"], "text": text, "intent": lab})

rng = random.Random(1337)
rng.shuffle(rows["dev"])
val, dev_rest = rows["dev"][:300], rows["dev"][300:]
seen, train = set(), []
for r in rows["train"] + dev_rest:
    k = r["text"].lower()
    if k in seen: continue
    seen.add(k); train.append(r)
rng.shuffle(train)

(HERE / "data").mkdir(exist_ok=True)
for name, rs in [("train", train), ("val", val)]:
    (HERE / f"data/{name}.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rs))
assert not ({r["convo_id"] for r in train + val} & excluded)
print(json.dumps({"train": len(train), "val": len(val), "excluded_convos": len(excluded),
                  "labels_in_train": len({r["intent"] for r in train}),
                  "smallest_labels": Counter(r["intent"] for r in train).most_common()[-3:]}))
