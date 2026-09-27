# Final demo script — Support AGI (~2:20)

Setup: clean Chrome window (maximised), QuickTime camera window bottom-right, Cmd+Shift+5 per shot. Cmd+Shift+R in each QM tab. New chat (+) before every ticket.

## 0. Customer view (~15 s) — storefront
Store https://kettle-and-co-support-hack.myshopify.com (password on request), chat bubble, email `crystalm392@example.com`, ask: "did my refund go through?" → instant answer, COMPILED badge.
> "This is Northwind Outfitters, a real Shopify store. A customer asks where her refund is and gets an answer in a second, with no model call. Here's what's behind it."

## 1. Intro (~12 s) — QM, empty chat, Paths panel
> "We're Support AGI. The agent runs in QM, YC's open-source harness. We forked it and built this Paths view to show how every ticket is handled."

## 2. Ticket A — explore (~35 s) — QM tab 1
```
From: joycewu709@example.com
I got a shirt for my husband, but he doesn't like it, so now I need to take it off my order. I don't want to cancel the whole order, just the men's Gale shirt. It says it's out for delivery.
```
> "A customer wants one shirt taken off her order. First, our own model, fine-tuned on River, turns her message into a standard request. There's no learned path for this yet, so the agent explores. It reads the store's policy from GBrain, pulls up her order in Shopify, and refunds the shirt. When it's done, Memorable saves how it solved it."

## 3. Shopify (~10 s) — order admin tab, Cmd+R
> "And that's a real refund in our Shopify store, done by our app."

## 4. Ticket B — recall + River (~30 s) — QM tab 2
```
From: normanbouc398@example.com
Hey! I placed a two item order, but I want to remove the second item. I totally chose the wrong size. Norman Bouchard
```
> "A different customer, in completely different words. River maps it to the same request, Memorable hands back the path it just learned, and the agent follows it: no policy search, fewer steps, lower cost."
> "Matching messy messages to the right path is the hard part. Our River model gets it right 65% of the time on held-out tickets, against 56% for Claude Haiku, and it cost about a dollar to train."

## 5. Compiled (~15 s) — QM tab 3
```
From: crystalm123@example.com
I was getting a refund on my order and I just want to check on the status of it. Crystal Minh
```
(fallback: `From: crystalm392@example.com` / "I am looking for the status of my refund. Crystal Minh")
> "Remember that refund answer on the store? This is what ran: a path that graduated into a plain JSON program. Zero model calls — and if any check fails, the ticket goes back to the agent."

## 6. Learning curve (~20 s) — scroll down in the Paths panel
> "We replayed 400 real support conversations from the ABCD dataset. Cost per ticket falls from 14 cents to under 5, against 18 cents for an agent without memory. By the end almost every ticket reuses a path or runs as code. And when a ticket is uncertain or asks for several things, it goes to the full agent."

## 7. Close (~10 s)
> "GBrain knows the business, Memorable remembers how, River is our own model, and QM runs it all. The paths, the programs and the model are ours. That's owning your intelligence."
