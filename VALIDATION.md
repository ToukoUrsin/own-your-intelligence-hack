# Current validation

**27 September 2026.** Outreach ended at 15:45 San Francisco time; replies were last checked at **15:58 PDT**.

We have a measured prototype improvement and public evidence that agent companies care about inference costs. **Customer demand for our product remains unvalidated: no substantive customer replies, pilots or LOIs yet.**

## Product hypothesis

Use a shared, fine-tuned generalist with memory and reusable workflows to reduce the inference cost of recurring agent tasks. The model serves customers across use cases; **no per-customer training is required**.

## Measured result

> **18.3¢ → 10.0¢ on the same 100 support tickets, 46% lower inference cost.** Across the full 400-ticket run, cost per ticket fell **66%**, from 13.9¢ for the first 25 tickets to 4.7¢ for the last 25.

These come from the final cold-start replay on a mock store (`replay/summary.json`). The 46% compares the no-memory agent with workflow reuse on the same first 100 tickets, while the path library was still filling. The 66% is the learning curve within one run, so its two buckets are different tickets. The estimate includes agent-model inference and the router. An earlier replay measured 8.37¢ → 5.65¢ (32%); the final run supersedes it.

Separately, fine-tuning improved a **55-label router from 23% to 77% accuracy** on a 100-case evaluation.

These are separate prototype experiments. Savings from the integrated generalist system at matched task quality have not yet been demonstrated on a customer's workload. Detailed measurements and source identities are in [pitch-claims.md](validation/pitch-claims.md).

## Evidence that the problem matters

| Source | Observed evidence | Implication |
|---|---|---|
| [Lindy engineering account](https://www.lindy.ai/blog/migrating-from-claude-to-deepseek) | Reports roughly 90% lower inference cost after a model migration. | Agent businesses already spend engineering effort on inference economics. |
| [Twin](https://twin.so/) | Reports median session cost falling from $9.14 to $3.70 in a model comparison. | Per-session cost is a concrete optimization target. |
| [Skyvern](https://www.skyvern.com/products) | Offers generated browser code that can be cached and reused. | Execution reuse already has commercial precedent; our incremental value needs testing. |

These are public company reports, not interviews or commitments to use our product.

## Customer outreach

Sent **45 individual emails to 45 companies** from **marc@heliosone.fi**, covering consumer assistants, travel, support, commerce, job applications, research, accounting, testing and agent infrastructure.

| Outcome | Observed result |
|---|---|
| Emails submitted | **45**, verified in Gmail Sent |
| Support acknowledgments | **2**: Poke and Duckbill |
| Rejected recipient route | **1**: Airial's restricted email group |
| Substantive customer replies | **0** |
| Agreed pilots | **0** |
| Letters of intent | **0** |

Poke acknowledged receipt. Duckbill said it forwarded the request to its support team. Neither answered the questions about inference costs or expressed buying interest. Sent records establish submission, not delivery or demand.

The emails asked about past efforts to reduce recurring agent costs and requested a quick reply or five-minute call. **No measured cost result was included in those emails**; the earlier 32% figure was checked afterward. No further outreach was sent after the cutoff.

The short response window does not establish rejection of the idea. It also gives us no basis to claim customer demand.

## Next useful validation

At Hogpatch or in a founder conversation, ask:

> On the same support tickets we measured 46% lower inference cost, and 66% lower by the end of a 400-ticket run. Do you have a recurring agent task we could test this on?

The next concrete signal is **one founder agreeing to a test**, with a named workflow, a small sanitized sample, a success criterion and a date. Compare inference cost and correct outcomes against their current setup. This would establish whether the measured improvement matters to a potential customer.

## Supporting records

- [Full research, contact list and segment analysis](validation/validation-brief.md)
- [Verified outreach records and exact messages](validation/outreach-evidence-2026-09-27.json)
- [Measured claims and experiment sources](validation/pitch-claims.md)
