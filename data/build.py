# Build tickets, held-out tickets, shop fixtures and brain procedure pages from ABCD (ASAPP, MIT).
# Run: python3 data/build.py   (stdlib only; reads data/abcd/raw/*)
import gzip, hashlib, json, random, re
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent
RAW = HERE / "abcd/raw"
data = json.load(gzip.open(RAW / "abcd_v1.1.json.gz"))
kb = json.load(open(RAW / "kb.json"))
guidelines = json.load(open(RAW / "guidelines.json"))
ontology = json.load(open(RAW / "ontology.json"))

COMPANY, DOMAIN = "Northwind Outfitters", "northwind-outfitters.example"
TODAY = "2026-09-27"
N_TICKETS, N_HELDOUT = 400, 100

# ABCD scenario brands -> original house labels (the shop's own lines; no real brand names).
BRANDS = {"michael_kors": "Mercer", "michael kors": "Mercer", "calvin_klein": "Kline", "calvin klein": "Kline",
          "guess": "Gale", "tommy_hilfiger": "Harbor", "tommy hilfiger": "Harbor", "tommy": "Harbor"}
TYPES = ["jeans", "shirt", "boots", "jacket"]
FAQ_FLOWS = {"single_item_query", "storewide_query"}
FLOW_OF = {s: f for f, subs in ontology["intents"]["subflows"].items() for s in subs}


def h(s: str) -> int:
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


def genericize(t: str) -> str:
    t = re.sub(r"\b(michael[ _]kors|calvin[ _]klein|tommy[ _]hilfiger)\b", lambda m: BRANDS[m.group(1).lower().replace("_", " ")], t, flags=re.I)
    t = re.sub(r"\bguess(?=[ _-]*(jeans|shirts?|boots?|jackets?|brand)\b)", "Gale", t, flags=re.I)
    t = re.sub(r"\btommy\b", "Harbor", t, flags=re.I)
    t = re.sub(r"\b([\w.+-]+)@[\w-]+\.(com|net|org)\b", lambda m: f"{m.group(1).lower()}@example.com", t)
    return t


def label(sc) -> tuple[str, str]:
    """(flow, subflow) with FAQ subflows collapsed to the ontology topic (timing_1 -> timing)."""
    flow, sub = sc["flow"], sc["subflow"]
    if flow in FAQ_FLOWS: sub = sub.split("_")[0]
    sub = {"status_questions": "status_active", "status_delivery_date": "status_delivery_time"}.get(sub, sub)  # ABCD v1.1 aliases
    return flow, sub


def slug(flow: str, sub: str) -> str:
    return f"procedures/{flow.replace('_', '-')}-{sub.replace('_', '-')}"


def title_case(n: str) -> str:
    return " ".join(w.capitalize() for w in n.split())


# ---------- customers & orders from scenarios ----------
customers: dict[str, dict] = {}
orders: dict[str, dict] = {}
tracking: dict[str, dict] = {}
refunds: list[dict] = []
product_prices: dict[str, list[int]] = defaultdict(list)
SHIP_STATUS = {"order received": "processing", "in transit": "shipped", "out for delivery": "shipped", "delivered": "delivered"}
# Order state that fits the problem when ABCD does not record it.
PREFER = {"manage_cancel": "order received", "manage_upgrade": "order received", "manage_downgrade": "order received",
          "manage_change_address": "order received", "status_payment_method": "order received", "manage": "in transit",
          "status": "in transit", "status_delivery_time": "in transit", "cost": "in transit", "missing": "delivered"}


def date_minus(days: int) -> str:
    import datetime as dt
    return (dt.date.fromisoformat(TODAY) - dt.timedelta(days=days)).isoformat()


def ensure(sc, convo_id: int) -> str:
    p, o = sc["personal"], sc["order"]
    name = title_case(p["customer_name"])
    user = p.get("username") or re.sub(r"[^a-z]", "", name.lower())[:10] + str(100 + h(str(convo_id)) % 900)
    email = genericize(p.get("email") or f"{user}@email.com").lower()
    k = h(email)
    c = customers.get(email)
    if not c:
        level = p["member_level"]
        addr = f"{title_case(o['street_address'])}, {title_case(o['city'])}, {o['state'].upper()} {o['zip_code']}, US"
        c = customers[email] = {
            "email": email, "name": name, "username": user, "accountId": p.get("account_id") or "".join(chr(65 + (k >> i) % 26) for i in range(10)),
            "plan": level.capitalize(), "membership": level, "since": date_minus(60 + k % 900), "phone": p.get("phone", ""),
            "defaultAddress": addr, "zip": o["zip_code"],
            "paymentMethods": [o.get("payment_method", ["credit card", "debit card", "paypal"][k % 3])],
            "newsletter": k % 2 == 0, "status": "active",
            "subscription": {"status": "active" if k % 5 else "cancelled", "plan": "Premium", "annualFee": 99,
                             "dueAmount": [0, 20, 49, 74, 99][k % 5], "dueDate": date_minus(-(k % 40) + 10)},
            "credit": 0, "services": [],
            **({"pin": p["pin_number"]} if p.get("pin_number") else {}),
            **({"securityAnswer": p["security_answer"]} if p.get("security_answer") else {}),
        }
    if o.get("products"):
        items = []
        for it in eval(o["products"]):  # ABCD stores a Python-literal list
            brand, typ = BRANDS.get(it["brand"], "Northwind"), it["product_type"]
            sku = f"{typ.upper()}-{brand.upper()}"
            items.append({"sku": sku, "name": f"{brand} {typ}", "price": int(it["amount"])})
            product_prices[sku].append(int(it["amount"]))
        oid = o.get("order_id") or str(3000000000 + h(email + str(convo_id)) % 999999999)
        if oid not in orders:
            ship = (o.get("shipping_status") or PREFER.get(sc["subflow"]) or "delivered").lower()
            status = SHIP_STATUS.get(ship, "delivered")
            age = {"processing": 1 + k % 2, "shipped": 3 + k % 4, "delivered": 8 + k % 30}[status]
            od = {"id": oid, "email": email, "items": items, "total": sum(i["price"] for i in items), "status": status,
                  "shippingStatus": ship, "placedAt": date_minus(age), "shipTo": o.get("full_address") and c["defaultAddress"],
                  "payment": {"method": o.get("payment_method", c["paymentMethods"][0]), "status": "paid"},
                  "invoiceId": f"INV-{oid[-6:]}", "giftPackaging": o.get("packaging") == "yes"}
            if status != "processing":
                tn = f"NW{oid}"
                od |= {"tracking": tn, "shippedAt": date_minus(age - 1)}
                if status == "delivered":
                    od["deliveredAt"] = date_minus(max(age - 4, 0))
                    tracking[tn] = {"lastScan": "Delivered, front door", "date": od["deliveredAt"], "delivered": True}
                elif ship == "out for delivery":
                    tracking[tn] = {"lastScan": f"Out for delivery, {title_case(o['city'])}", "date": TODAY, "delivered": False, "eta": TODAY}
                else:
                    tracking[tn] = {"lastScan": "In transit, regional hub", "date": date_minus(1), "delivered": False, "eta": date_minus(-2)}
            orders[oid] = od
            if sc["subflow"] in ("refund_status", "refund_update"):
                refunds.append({"id": f"RF-{oid[-5:]}", "orderId": oid, "amount": od["total"], "reason": "Return received",
                                "status": "processing", "createdAt": date_minus(5), "method": od["payment"]["method"]})
    return email


# ---------- tickets ----------
def opening(convo) -> str:
    """Customer utterances before the agent's first action (max 3): enough to state the problem."""
    out = []
    for speaker, text in convo["original"]:
        if speaker == "action": break
        if speaker == "customer": out.append(text.strip())
        if len(out) == 3: break
    return genericize(" ".join(out))


def gold(convo) -> list[dict]:
    acts = []
    for t in convo["delexed"]:
        if t["speaker"] == "action":
            acts.append({"action": t["targets"][2], "values": [genericize(str(v)) for v in t["targets"][3]]})
    return acts


def ticket(prefix: str, i: int, convo) -> dict:
    sc = convo["scenario"]
    email = ensure(sc, convo["convo_id"])
    flow, sub = label(sc)
    t = {"id": f"{prefix}{i:04d}", "text": opening(convo), "email": email, "flow": flow, "subflow": sub,
         "intent": sub, "actions": gold(convo), "convo_id": convo["convo_id"]}
    if flow in FAQ_FLOWS: t["faq"] = sc["subflow"]
    return t


# Long tail: what a clothing retailer's inbox looks like (rank 1 most common); unranked subflows by ABCD frequency.
HEAD = ["status", "refund_status", "recover_password", "missing", "return_size", "manage_cancel", "status_delivery_time",
        "recover_username", "refund_initiate", "promo_code_invalid", "manage", "reset_2fa", "cost", "manage_change_address",
        "return_color", "return_stain", "refund_update", "timing", "policy", "status_due_date", "credit_card", "shopping_cart",
        "bad_price_yesterday", "status_due_amount", "manage_pay_bill", "jeans", "boots", "pricing", "membership"]
by_label = defaultdict(list)
for c in data["train"]:
    if opening(c): by_label[label(c["scenario"])[1]].append(c)
freq = Counter({k: len(v) for k, v in by_label.items()})
RANKED = HEAD + [k for k, _ in freq.most_common() if k not in HEAD]
assert len(RANKED) == 55 and set(RANKED) == set(FLOW_OF), (len(RANKED), set(FLOW_OF) ^ set(RANKED))
w = [1 / (i + 1) ** 1.05 for i in range(len(RANKED))]
counts = {s: max(2, round(N_TICKETS * x / sum(w))) for s, x in zip(RANKED, w)}
while sum(counts.values()) > N_TICKETS: counts[RANKED[0]] -= 1
while sum(counts.values()) < N_TICKETS: counts[RANKED[0]] += 1

rng = random.Random(42)
picked = []
for s in RANKED:
    pool = sorted(by_label[s], key=lambda c: c["convo_id"])
    picked += rng.sample(pool, counts[s])
rng.shuffle(picked)
tickets = [ticket("T", i + 1, c) for i, c in enumerate(picked)]

test_by = defaultdict(list)
for c in data["test"]:
    if opening(c): test_by[label(c["scenario"])[1]].append(c)
held = []
for rnd in range(3):
    for s in RANKED:
        pool = sorted(test_by[s], key=lambda c: c["convo_id"])
        if len(pool) > rnd: held.append(pool[rnd])
held = held[:N_HELDOUT]
rng.shuffle(held)
heldout = [ticket("H", i + 1, c) for i, c in enumerate(held)]

products = sorted(({"sku": sku, "name": f"{sku.split('-')[1].capitalize()} {sku.split('-')[0].lower()}", "type": sku.split("-")[0].lower(),
                    "line": sku.split("-")[1].capitalize(), "price": sorted(v)[len(v) // 2]} for sku, v in product_prices.items()), key=lambda p: p["sku"])
shop = {"company": COMPANY, "today": TODAY, "products": products, "customers": list(customers.values()), "orders": list(orders.values()),
        "tracking": tracking, "refunds": refunds, "promoCodes": [{"code": "WELCOME10", "percent": 10, "expires": "2026-12-31"}, {"code": "SUMMER20", "percent": 20, "expires": "2026-08-31"}]}

for name, rows in (("tickets.jsonl", tickets), ("heldout.jsonl", heldout)):
    (HERE / name).write_text("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in rows))
(HERE / "shop.json").write_text(json.dumps(shop, indent=1, ensure_ascii=False) + "\n")

# ---------- brain procedure pages (one per ABCD subflow) ----------
TOOL = {"pull up account": "pull_up_account", "verify identity": "verify_identity", "validate purchase": "validate_purchase",
        "ask the oracle": "check_system", "record reason": "record_reason", "enter details": "enter_details", "enter detail": "enter_details",
        "offer refund": "offer_refund", "make purchase": "make_purchase", "shipping status": "shipping_status", "update order": "update_order",
        "update account": "update_account", "send link": "send_link", "notify team": "notify_team", "notify internal team": "notify_team",
        "make password": "make_password", "promo code": "promo_code", "subscription status": "subscription_status",
        "membership privileges": "membership", "membership": "membership", "try again": "try_again", "log out/in": "log_out_in",
        "log out / in": "log_out_in", "instructions": "instructions", "search faq": "search_kb", "select answer": "search_kb"}
KB_TOOL = {"pull-up-account": "pull_up_account", "verify-identity": "verify_identity", "validate-purchase": "validate_purchase",
           "ask-the-oracle": "check_system", "record-reason": "record_reason", "enter-details": "enter_details", "offer-refund": "offer_refund",
           "make-purchase": "make_purchase", "shipping-status": "shipping_status", "update-order": "update_order", "update-account": "update_account",
           "send-link": "send_link", "notify-team": "notify_team", "make-password": "make_password", "promo-code": "promo_code",
           "subscription-status": "subscription_status", "membership": "membership", "try-again": "try_again", "log-out-in": "log_out_in",
           "instructions": "instructions", "search-faq": "search_kb"}


def tool_text(t: str) -> str:
    t = re.sub(r"\[([^\]]+)\]", lambda m: f"`{TOOL.get(m.group(1).strip().lower(), m.group(1))}`", t)
    return genericize(t).replace("Pull up Account", "pull_up_account")


GUIDE_KEY = {}  # ABCD subflow id -> (flow title, subflow title)
for ftitle, f in guidelines.items():
    for stitle in f["subflows"]:
        GUIDE_KEY[stitle] = ftitle
NAME_TO_ID = {"Initiate Refund": "refund_initiate", "Update Refund": "refund_update", "Refund Status": "refund_status",
              "Return Due to Stain": "return_stain", "Return Due to Color": "return_color", "Return Due to Size": "return_size",
              "Reset Two-Factor Auth": "reset_2fa", "Invalid Credit Card": "credit_card", "Cart Not Updating": "shopping_cart",
              "Search Not Working": "search_results", "Website Too Slow": "slow_speed", "Out-of-Stock General": "out_of_stock_general",
              "Out-of-Stock One Item": "out_of_stock_one_item", "Shipping Status": "status", "Manage Shipping": "manage",
              "Missing Item": "missing", "Shipping Cost": "cost", "Boots FAQ": "boots", "Shirt FAQ": "shirt", "Jeans FAQ": "jeans",
              "Jacket FAQ": "jacket", "Pricing FAQ": "pricing", "Membership FAQ": "membership", "Timing FAQ": "timing", "Policy FAQ": "policy"}

pdir = ROOT / "brain/procedures"
for p in pdir.glob("*.md"): p.unlink()
examples = defaultdict(list)
for t in tickets:
    if len(examples[t["subflow"]]) < 3 and 20 < len(t["text"]) < 220: examples[t["subflow"]].append(t["text"])
for ftitle, f in guidelines.items():
    for stitle, s in f["subflows"].items():
        sid = NAME_TO_ID.get(stitle) or re.sub(r"[^a-z0-9]+", "_", stitle.lower()).strip("_")
        assert sid in FLOW_OF, (stitle, sid)
        flow = FLOW_OF[sid]
        lines = [f"---\ntitle: \"Procedure: {stitle} ({ftitle})\"\ntype: procedure\nintent: {sid}\nflow: {flow}\n---\n",
                 f"# {stitle} ({ftitle})\n", f"Request type `{sid}` in the {ftitle.lower()} family ({f['description']}).\n"]
        if examples[sid]:
            lines.append("Customers typically write:\n" + "".join(f"- \"{e}\"\n" for e in examples[sid]))
        lines.append("## Steps\n")
        for n, a in enumerate(s["actions"], 1):
            lines.append(f"{n}. {tool_text(a['text'])}")
            lines += [f"   - {tool_text(x)}" for x in a.get("subtext", [])]
        if s.get("instructions"):
            lines.append("\n## Notes\n" + "".join(f"- {tool_text(x)}\n" for x in s["instructions"]))
        if sid in kb:
            lines.append("\n## Required actions (in order)\n" + " → ".join(f"`{KB_TOOL.get(a, a)}`" for a in kb[sid]) + "\n")
        if flow in FAQ_FLOWS:
            lines.append(f"\nAnswers are on the FAQ page `faq/{sid}`.\n")
        lines.append("\nWrap up by asking whether the customer needs anything else.\n")
        (pdir / f"{flow.replace('_', '-')}-{sid.replace('_', '-')}.md").write_text("\n".join(lines))

print("tickets per subflow:", counts)
print(len(tickets), "tickets,", len(heldout), "held-out,", len(customers), "customers,", len(orders), "orders,", len(products), "products")
