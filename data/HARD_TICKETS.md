# Hard tickets

`hard_tickets.jsonl`: 42 hard support tickets for Northwind Outfitters. The format matches `tickets.jsonl`, plus `hard_kind`, `source` and `note`. IDs are `H001`–`H042`; held-out tickets use `H0001`.

**Why:** the replay set is mostly routine. These tickets are the long tail, where one template or router label is not enough. They should go to the full agent, which can read the shop data, apply policy and escalate. Use them to check that the router or cheap path hands them off instead of confidently misrouting them.

## ABCD (15, `source: "abcd"`)
ABCD conversations from `abcd/raw/abcd_v1.1.json.gz`. None are in `tickets.jsonl` or `heldout.jsonl`. Each is from a customer whose email already exists in `shop.json`. `text` is built with `opening()` from `build.py`, and `actions` holds ABCD's gold actions.
- `long_conversation` (5): the longest chats, 44–54 turns.
- `request_change` (5): the agent's actions go well beyond the labeled subflow's standard sequence, meaning the customer changed or added requests partway through.
- `rare_subflow` (5): the least frequent subflows, one each.

Order IDs in ABCD actions may not match an order in `shop.json`.

## Constructed (27, `source: "constructed"`)
Written by hand for this set. Each uses real customers and orders from `shop.json`. `actions` are the expected human-agent actions in ABCD format; `[]` means escalate. `note` gives the expected outcome and the data fact that decides it.
- `multi_request` (3): two requests in one message. `flow`/`subflow` are `multi`.
- `missing_identifier` (3): no order number or name.
- `contradiction` (4): the claim contradicts the data, e.g. "delivered" when the order is not shipped, a refund that is already processing, or a mistyped order ID.
- `policy_edge` (6): guest vs gold returns at the same order age, the bronze 90-day window, an expired promo for guest vs gold, and a bronze extra fee.
- `angry_long` (3): emotional or threatening messages, including a cancel request after the order is out for delivery.
- `escalate` (4): no tool can handle these (health/legal claim, data deletion, wholesale, fraud). `flow`/`subflow` are `none`.
- `non_english` (2, Finnish and Spanish) and `typo_heavy` (2).
