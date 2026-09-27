---
title: "Northwind Outfitters"
type: company
---
# Northwind Outfitters

Northwind Outfitters is an online clothing retailer (US). We sell four product types (jeans, shirts, boots, jackets) in four house lines: **Mercer**, **Kline**, **Gale** and **Harbor**. See `products/catalog`.

- Support handles orders, shipping, returns and refunds, purchase disputes (prices, promo codes, billing), accounts (username, password, two-factor), profile changes, the Premium subscription, site troubleshooting and product/store FAQs.
- Every request type has a procedure page under `procedures/<flow>-<subflow>`; follow its required actions in order.
- Customers are identified by full name or account ID (`pull_up_account`). Identity checks use name + account ID + order ID (`verify_identity`); purchase checks use username + email + order ID (`validate_purchase`).
- Membership levels: Gold, Silver, Bronze, Guest (`policies/membership`).
- Internal teams reachable with `notify_team`: manager, website team, purchasing department.
- Support email support@northwind-outfitters.example; the agent always wraps up by asking whether the customer needs anything else.
