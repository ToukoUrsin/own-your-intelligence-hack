# Support workflow UX

## The decision the interface serves

Let an operator answer: **What did this request need, what happened, and what
requires my attention?** The customer sees the answer and necessary next step.
The operator may inspect the canonical request, chosen procedure, tool evidence
and execution metrics in the dashboard. Keep internal diagnostics out of the
customer reply.

The current product plan places the chat and dashboard in QM. This package
does not change that architecture or claim any connector is integrated.

## Three distinct kinds of state

| Kind | Examples | Owner and display rule |
| --- | --- | --- |
| Execution | Queued, running, finished, failed | Actual run events; a finished model turn does not imply resolution |
| Method | Explored, saved path, assisted | Actual routing/execution receipt; method alone is neutral |
| Outcome | Resolved, needs review, unavailable | Evidence of the requested result, a named unresolved decision, or missing evidence |

Do not encode all three into a single success badge. A recalled path can fail;
an explored run can resolve the request. A match score is not permission to act.
Validate the original request, normalized record, candidate procedure, current
facts and tool permissions before reuse. Follow [Canonical request v1](../CANONICAL_REQUEST_V1.md).

The `replayed` visual variant is neutral and may label a method. It must not
replace an outcome. `running` uses amber; `resolved` uses restrained green;
`review` uses yellow; `failed` uses red. Every state has a readable label.

## Data and metrics

Read metrics from the owning trace: current `agent/src/agent.ts` exposes `ms`,
`steps`, `inputTokens`, `outputTokens` and `modelCalls`. Duration can derive from
`ms`; successful recorded steps can be counted from `steps`. Those values do
not by themselves prove total attempted tool calls or a resolved customer
outcome. Preserve that distinction when adapting the real dashboard.

The current trace has no billed monetary cost or validated resolution field.
Show “Cost unavailable” until the application supplies an explicit cost basis.
Do not treat token counts as currency, a nonempty reply as resolution, or a
successful tool request as an external write receipt.

For learning curves, state the unit, time window, sample size, inclusion rule
and measurement basis. Compare equivalent request cohorts before describing
savings. A normalized request, a recalled procedure and a trained model each
need their own evidence. Specimen data stays in `reference/examples.js`; never
promote it into performance results, a live counter or a fallback production feed.

Keep IDs, source revision and timestamps reachable in details where useful.
Distinguish reported, estimated and confirmed facts. An absent amount is not
zero. An absent relationship is unresolved, not proof that no relationship
exists. Every required value must be present or explicitly marked unavailable
with its reason and resolution path.

## Load and failure behavior

| Condition | User-facing behavior |
| --- | --- |
| First read in progress | A bounded loading state that reaches content, empty or error |
| Refresh with existing data | Retain the last complete result; show refresh locally |
| Empty path library | Explain what will appear and offer the first relevant setup action |
| No matching filters | Show the active criteria and a Clear filters action |
| One lookup failed | Keep other records visible; show a local reason and retry |
| Stale evidence | Show observation time and which action needs fresh evidence |
| Human decision needed | Name the decision, owner and context needed to proceed |
| External result uncertain | Show an unresolved result; reconcile before retrying a write |

Update selection and local interaction state immediately. Fence late results
to the selected run and request sequence. Avoid a fetch for every table row or
a global spinner that replaces usable data. Reuse existing application read
models rather than inventing parallel frontend truth.

## Writing

Use short, direct sentences and concrete verbs. “Review address change,”
“Retry tracking lookup,” and “Copy run ID” tell the user what will happen.
“Processing” without the work being processed does not.

Show the observed result before explanatory details. No hype, decorative
technical jargon, apologies in every error, or generic “Success” labels.
Avoid “instant,” “cheaper” and “resolved” unless the displayed evidence supports
them. Keep the customer's original message available beside its normalization.

## Acceptance before shipping a consuming UI

- [ ] Verify the actual route with populated customer-shaped data and the exact source revision.
- [ ] Inspect request, method, outcome, units and every required value; no placeholder satisfies a requirement.
- [ ] Exercise first-load, retained refresh, empty library, no matches, partial failure and failed write states.
- [ ] Check dark and light at desktop and 390px; also inspect 320px reflow and zoomed text.
- [ ] Confirm hidden table columns are available through keyboard-reachable details.
- [ ] Check keyboard traversal, visible focus, form errors, dialog Escape and focus return.
- [ ] Check reduced motion and a coarse-pointer layout; nothing relies only on color or hover.
- [ ] Use the generated-token check, then visually inspect the real rendered components.
- [ ] Separate local reference checks from deployed QM integration and authenticated user behavior.

The shipped reference is only proof of this portable system's rendering and
local interactions. Integration with QM and real support executions remains a
separate implementation and acceptance task.
