# Data

## Source
- **ABCD — Action-Based Conversations Dataset** (ASAPP Research), https://github.com/asappresearch/abcd, `data/` folder downloaded 2026-09-27 into `abcd/raw/` (unmodified: `abcd_v1.1.json.gz`, `guidelines.json`, `kb.json`, `ontology.json`, `abcd_sample.json`, `LICENSE`).
- 10,042 human-human customer-service chats for an online clothing retailer (train 8,034 / dev 1,004 / test 1,004), 10 flows / 55 subflows, with the agent's ground-truth actions and slot values, agent guidelines per subflow and scenario data (customer, username, email, membership, order, products).
- **License: MIT** (Copyright (c) 2021 ASAPP Research), see `abcd/raw/LICENSE`. Keep the notice with redistributed data.
- Retired: Bitext (`raw/bitext-train.parquet`, CDLA-Sharing-1.0), kept for reference only.

## Our shop
**Northwind Outfitters**, a fictional online clothing retailer. ABCD's scenario brands are replaced by house lines (Mercer, Kline, Gale, Harbor) and emails are rewritten to `@example.com`; names, usernames, account IDs and order IDs come from ABCD scenarios. Dates are shifted to around 2026-09-27.

## Files
| File | What |
|---|---|
| `build.py` | Deterministic builder (stdlib): `python3 data/build.py`. Writes tickets, held-out, `shop.json` and `brain/procedures/*`. |
| `tickets.jsonl` | 400 replay tickets from ABCD **train**, long-tail over all 55 subflows (shipping `status` 91 … 2 each for the tail), shuffled (seed 42). |
| `heldout.jsonl` | 100 tickets from ABCD **test** (1–2 per subflow) for router hit rate. |
| `shop.json` | Customers, orders, tracking, refunds and products for every ticket's scenario (used by `agent/src/shop.ts` and the Shopify seeder). |
| `ROUTER.md` | Spec for the River router (label set = 55 subflows). |

Ticket fields: `id`, `text` (customer turns before the agent's first action, max 3), `email` (sender; matches `shop.json`), `flow`, `subflow`, `intent` (= subflow), `actions` (gold ABCD action sequence: `[{action, values}]`), `convo_id` (ABCD), `faq` (specific FAQ item for FAQ subflows). Agents receive the ticket with the sender email, e.g. `From: <email>\n\n<text>` (the replay appends `(from: <email>)`).

`shop.json`: `{company, today, products[{sku,name,type,line,price}], customers[{email,name,username,accountId,plan (= membership, capitalized),membership,since,phone,defaultAddress,zip,paymentMethods[],newsletter,status,subscription{status,plan,annualFee,dueAmount,dueDate},credit,services[],pin?,securityAnswer?}], orders[{id (10 digits),email,items[{sku,name,price}],total,status (processing|shipped|delivered),shippingStatus (order received|in transit|out for delivery|delivered),placedAt,shipTo,payment{method,status},invoiceId,giftPackaging,tracking?,shippedAt?,deliveredAt?}], tracking{<number>: {lastScan,date,delivered,eta?}}, refunds[{id,orderId,amount,reason,status,createdAt,method}], promoCodes[]}`.

Brain: `brain/procedures/<flow>-<subflow>.md` (55, generated from `guidelines.json` + `kb.json` with ABCD buttons renamed to our tool names), plus hand-written `company/`, `policies/` (membership, returns-refunds, shipping, subscription, promo-codes, site-troubleshooting), `products/catalog` and `faq/<topic>` answers.
