# UX

How Support AGI screens behave. The audience is a support lead or a judge watching a demo: they need to see, at a glance, which route a ticket took, whether it worked, and what it cost.

## Information

- **Lead with the value, state or action.** Labels are 1–3 words. One clear title per view; no subtitles that repeat it.
- **Route and outcome are separate facts.** Route is how the ticket ran (explored, recalled, compiled). Outcome is what happened (resolved, needs human, fell back). Never merge them into one status.
- **Show the path.** Any ticket can be opened into its step trace: tool names in mono, the note that mattered (similarity, guard result, amount), and the failing step marked.
- **Cost, time and calls travel together** as `12.4 s · $0.08 · 5 steps`. Cost always has two decimals; `$0.00` is a real value for compiled runs, not a missing one.
- **Canonical request before raw text** in detail views; raw text in tables, truncated with the full text on hover or focus.
- **Density:** 13–15px interface text, 52px table rows, hairlines instead of boxes inside a card. Decorative stat grids are not allowed: a metric card earns its place by carrying a number someone will act on or quote.

## Truthfulness

- **Missing is explicit.** Unavailable data reads "Unavailable" with a reason. Never a silent zero, blank date or green status by default.
- **Stand-ins are labelled** where they appear ("Haiku stand-in router", "mock shop"), not in a footnote.
- **Example data says so** on the same screen, as the reference page does.
- **Success needs evidence.** "Resolved" means the action happened (refund id, updated address), not that the model said it would.
- **Guards fail visibly.** A compiled route that falls back shows which guard failed and that the agent took over.

## States

| State | Behaviour |
| --- | --- |
| Loading | Keep the last complete view. Skeletons only where nothing has loaded yet, shaped like the content. No spinners over usable data. |
| Empty | Say what is empty and why, offer one action ("No compiled paths yet. A path compiles after three successful recalls." + Run replay). |
| No match | Echo the query, say what search covers, offer "Clear search". |
| Partial / stale | Show what is there, with a notice naming what is missing or how old it is. |
| Error | Local to the panel that failed, with its own retry. Say what happened and what to do; no apologies, no exclamation marks. |
| Live change | Flash the changed row's tint once (≈1.4s); don't reorder under the pointer. |

Acknowledge input within 100ms: pressed states, optimistic selection, filter changes applied immediately.

## Interaction

- One primary action per view. Destructive actions are text buttons that confirm in a dialog naming the object.
- Filters sit in one row above what they filter, as a segmented control plus search. Filters never repaint route colours.
- Tables: whole row selects, `Enter`/`Space` open, arrow keys move. Selected row and detail card stay in sync.
- Dialogs close on Escape, on backdrop click and with a visible button; focus returns to the trigger.
- Theme: light by default. Remember an explicit dark choice per browser; `data-theme="system"` follows the OS.

## Copy

- Sentence case everywhere, including buttons and titles.
- Verbs on buttons ("Approve refund", not "OK"). Nouns on tabs and filters.
- Numbers with units in the same cell: `6.2 s`, `38%`, `$0.07`. Deltas say what they compare to: "62% vs no memory".
- Customer names and emails only where the task needs them; ticket IDs otherwise.

## Accessibility

- Text 4.5:1 and controls 3:1 on every surface, including glass over glows (enforced by `build-tokens.mjs --check`).
- Visible 2px focus ring on keyboard focus; fields thicken their own edge instead.
- Colour never carries meaning alone: chips have glyph + word, charts have legends, direct labels and a table view.
- Glass falls back to solid for reduced transparency, high contrast and unsupported browsers. Motion stops for reduced motion.
- Touch: 44px (`--lg`) controls on touch-first screens; tables scroll inside their card, never the page.
- Test at 1440, 1024, 768 and 390px in both themes, with a screenshot of each state you claim works.
