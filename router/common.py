# Shared prompt, label set and River plumbing for the subflow router (data/ROUTER.md).
import json, math, os, re, subprocess
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent
BASE = "Qwen/Qwen3.6-35B-A3B-FP8"
HSEC_KEY = "riverai-api-key"  # same River key as the other River work; runs are tagged experiment=claude-router
TAGS = {"experiment": "claude-router"}

# data/ROUTER.md label set: 55 subflows in 10 flows.
FLOWS = {
    "account_access": "recover_username recover_password reset_2fa",
    "manage_account": "status_service_added status_service_removed status_shipping_question status_credit_missing manage_change_address manage_change_name manage_change_phone manage_payment_method",
    "order_issue": "status_mystery_fee status_delivery_time status_payment_method status_quantity manage_upgrade manage_downgrade manage_create manage_cancel",
    "product_defect": "refund_initiate refund_update refund_status return_stain return_color return_size",
    "purchase_dispute": "bad_price_competitor bad_price_yesterday out_of_stock_general out_of_stock_one_item promo_code_invalid promo_code_out_of_date mistimed_billing_already_returned mistimed_billing_never_bought",
    "shipping_issue": "status manage missing cost",
    "single_item_query": "boots shirt jeans jacket",
    "storewide_query": "pricing membership timing policy",
    "subscription_inquiry": "status_active status_due_amount status_due_date manage_pay_bill manage_extension manage_dispute_bill",
    "troubleshoot_site": "credit_card shopping_cart search_results slow_speed",
}
LABELS = [s for subs in FLOWS.values() for s in subs.split()]
assert len(LABELS) == len(set(LABELS)) == 55
LABEL_SET = set(LABELS)

SYSTEM = (
    "You route customer-support messages for Northwind Outfitters, an online clothing store. "
    "Read the customer's opening message and reply with exactly one request label from the list below, "
    "nothing else. Reply none only if no label fits.\n\n"
    + "\n".join(f"{flow}: {', '.join(subs.split())}" for flow, subs in FLOWS.items())
)


def messages(text: str, label: str | None = None) -> list[dict]:
    m = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": text}]
    if label is not None:
        m.append({"role": "assistant", "content": label})
    return m


def parse(output: str) -> str:
    """Bare label, or the label inside 'flow: label'; a flow name alone or anything else is 'none'."""
    found = [w for w in re.findall(r"[a-z0-9_]+", output.lower()) if w in LABEL_SET]
    return found[-1] if found else "none"


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(l) for l in path.read_text().splitlines() if l.strip()]


def api_key() -> str:
    key = os.environ.get("RIVER_API_KEY", "").strip()
    if key:
        return key
    r = subprocess.run(["hsec", "get", HSEC_KEY], capture_output=True, timeout=20)
    if r.returncode or not r.stdout.strip():
        raise SystemExit("could not read River key from hsec; run `hsec unlock`")
    return r.stdout.decode().strip()


def client():
    import river_client as river
    return river.Client(api_key=api_key())


def renderer():
    from river_client.renderers import get_renderer
    return get_renderer(BASE, thinking=False)


def prompt_ids(rend, text: str) -> list[int]:
    p = rend.build_sample_prompt(messages(text))
    return rend.tokenizer.encode(p.prompt, add_special_tokens=False)


def classify(session, rend, texts: list[str], checkpoint=None, timeout: float = 600) -> list[dict]:
    """Greedy label per text; confidence = probability of the generated label tokens."""
    groups = session.sample(prompt_token_ids=[prompt_ids(rend, t) for t in texts], base_model=BASE,
                            checkpoint=checkpoint, temperature=0, seed=1337, max_tokens=16, logprobs=1,
                            stop=rend.get_stop_strings(), timeout=timeout)
    out = []
    for g in groups:
        s = g[0]
        lps = getattr(s, "logprobs", None) or []
        vals = [lp if isinstance(lp, (int, float)) else getattr(lp, "logprob", None) for lp in lps]
        vals = [v for v in vals if isinstance(v, (int, float))]
        conf = round(math.exp(sum(vals)), 4) if vals else None
        out.append({"raw": s.text, "intent": parse(s.text), "confidence": conf})
    return out
