---
title: "Procedure: Set up or update the default shipping address"
type: procedure
intent: set_up_shipping_address
category: SHIPPING
---
# Set up or update the default shipping address

Intent `set_up_shipping_address` (SHIPPING). Customers say: add a new address, save delivery address, set up my shipping address.

1. Find the customer (`find_customer`).
2. If they gave the address, `update_account` with `defaultAddress`. Otherwise explain: Account → Addresses → Add address on kettleandco.example.
3. We ship to US, Canada, UK and EU only. Open processing orders keep their old address unless changed ([[procedures/change-shipping-address]]).
