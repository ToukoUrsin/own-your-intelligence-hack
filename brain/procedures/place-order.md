---
title: "Procedure: Place an order"
type: procedure
intent: place_order
category: ORDER
---
# Place an order

Intent `place_order` (ORDER). Customers say: I want to buy, help me order, purchase a product.

1. Ask which products and quantities if not stated; `list_products` has SKUs and prices.
2. Find the customer (`find_customer` by email). If they have no account, they can order as guest on the website or we create one ([[procedures/create-account]]).
3. With an account and a saved payment method, `place_order` for them; confirm total, shipping address and payment method first.
4. Otherwise send them to kettleandco.example to check out.
