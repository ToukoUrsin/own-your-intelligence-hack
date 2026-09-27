# Build tickets.jsonl and heldout.jsonl from the raw Bitext parquet.
# Run: uv run --with pandas --with pyarrow python data/build.py
import json, random, re
from pathlib import Path
import pandas as pd

HERE = Path(__file__).parent
df = pd.read_parquet(HERE / "raw/bitext-train.parquet").reset_index(names="row")
shop = json.loads((HERE / "shop.json").read_text())
customers = shop["customers"]
orders_by_email = {c["email"]: [o for o in shop["orders"] if o["email"] == c["email"]] for c in customers}
refunds_by_order = {r["orderId"]: r for r in shop["refunds"]}

# Long-tail frequency: rank 1 is the most common intent in a real shop inbox.
RANKED = [
    "track_order", "get_refund", "cancel_order", "change_shipping_address", "delivery_period", "track_refund",
    "recover_password", "payment_issue", "change_order", "get_invoice", "complaint", "check_refund_policy",
    "contact_human_agent", "delivery_options", "edit_account", "check_invoice", "place_order",
    "check_payment_methods", "contact_customer_service", "set_up_shipping_address", "switch_account",
    "newsletter_subscription", "delete_account", "create_account", "registration_problems", "review",
    "check_cancellation_fee",
]
assert sorted(RANKED) == sorted(df.intent.unique())
N_TICKETS, N_HELDOUT = 400, 100
weights = [1 / (i + 1) ** 1.1 for i in range(len(RANKED))]
counts = {it: max(2, round(N_TICKETS * w / sum(weights))) for it, w in zip(RANKED, weights)}
while sum(counts.values()) > N_TICKETS: counts[RANKED[0]] -= 1
while sum(counts.values()) < N_TICKETS: counts[RANKED[0]] += 1

# Which order status fits each intent best when a ticket mentions an order number.
PREFER = {
    "cancel_order": "processing", "change_order": "processing", "change_shipping_address": "processing",
    "track_order": "shipped", "delivery_period": "shipped", "get_refund": "delivered", "complaint": "delivered",
    "review": "delivered", "track_refund": "refund",
}
PLANS = ["Standard", "Plus", "Business"]
CITIES = [("Portland", "US"), ("Paris", "France"), ("Berlin", "Germany"), ("Toronto", "Canada"), ("London", "United Kingdom"), ("Seattle", "US")]


def fill(text: str, intent: str, rng: random.Random):
    """Replace Bitext placeholders with values from the synthetic shop; returns (text, customer email)."""
    c = rng.choice(customers)
    orders = orders_by_email[c["email"]]
    want = PREFER.get(intent)
    if want == "refund":
        pool = [o for o in shop["orders"] if o["id"] in refunds_by_order]
        order = rng.choice(pool); c = next(x for x in customers if x["email"] == order["email"])
    else:
        pool = [o for o in orders if o["status"] == want] or orders
        order = rng.choice(pool)
    refund = refunds_by_order.get(order["id"])
    city, country = rng.choice(CITIES)
    values = {
        "Order Number": order["id"], "Invoice Number": order["invoiceId"], "Person Name": c["name"].split(" (")[0],
        "Refund Amount": str(refund["amount"] if refund else order["total"]), "Currency Symbol": "$",
        "Delivery City": city, "Delivery Country": country,
    }
    def sub(m):
        key = m.group(1).strip()
        if key in ("Account Type", "Account Category"): return rng.choice(PLANS)
        return values.get(key, m.group(0))
    return re.sub(r"\{\{([^}]+)\}\}", sub, text), c["email"]


def row(prefix: str, i: int, r, rng: random.Random):
    text, email = fill(r.instruction, r.intent, rng)
    return {"id": f"{prefix}{i:04d}", "text": text.strip(), "intent": r.intent, "category": r.category, "email": email, "flags": r.flags, "source_row": int(r.row)}


rng = random.Random(42)
picked, tickets = set(), []
for it in RANKED:
    rows = df[df.intent == it].sample(n=counts[it], random_state=7)
    picked |= set(rows.row)
    tickets += list(rows.itertuples())
rng.shuffle(tickets)
out = [row("T", i + 1, r, rng) for i, r in enumerate(tickets)]

# Held-out: messy wording (Q colloquial, Z typos, W offensive), spread evenly across intents, never in tickets.
rest = df[~df.row.isin(picked) & df["flags"].str.contains("[QZW]")]
per = N_HELDOUT // len(RANKED) + 1
held = pd.concat([rest[rest.intent == it].sample(n=per, random_state=11) for it in RANKED]).sample(frac=1, random_state=3).head(N_HELDOUT)
held_out = [row("H", i + 1, r, rng) for i, r in enumerate(held.itertuples())]

for name, rows_ in (("tickets.jsonl", out), ("heldout.jsonl", held_out)):
    (HERE / name).write_text("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in rows_))
print("tickets per intent:", counts)
print(len(out), "tickets,", len(held_out), "held-out")
