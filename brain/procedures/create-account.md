---
title: "Procedure: Create an account"
type: procedure
intent: create_account
category: ACCOUNT
---
# Create an account

Intent `create_account` (ACCOUNT). Customers say: open an account, sign up, register, new user.

1. `find_customer` first; if the email already has an account, offer a password reset instead.
2. Otherwise `create_account` (Standard plan) with their email and name; a verification email is sent.
3. Mention Plus ([[company/kettle-and-co]]) only if they ask about plans.
