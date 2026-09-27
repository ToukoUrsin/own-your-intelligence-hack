# Design

The UI contract for Support AGI (QM Paths panel, dashboards, video cards). Files and the runnable reference live in [design-system/](design-system/README.md). Read this page before building UI; it is short on purpose.

## Look

**Light, clean cards, liquid glass.** Warm off-white canvas with a quiet amber-and-sky wash. Content sits on glass cards: translucent, blurred, lit from the top-left, with a soft cast shadow. Chrome floats. Type is Geist throughout, titles at regular weight; identifiers and tool names are Geist Mono. Dark is opt-in (`data-theme="dark"`), never the default.

## Use it

```html
<link rel="stylesheet" href="design-system/index.css" />
<html data-theme="light">
```

Tailwind v4: `@import "tailwindcss"; @import "./design-system/index.css"; @import "./design-system/tailwind.theme.css";` gives utilities such as `bg-surface`, `text-fg-muted`, `rounded-lg`, `shadow-md`. TypeScript: `import { tokens, cssVar } from "./design-system/tokens"`.

Edit colours, sizes or glass only in `design-system/tokens.json`, then run `node design-system/build-tokens.mjs`. `--check` fails on stale output or any failing contrast pair (60 pairs, both themes, glass checked over the canvas and over each glow).

## Rules

1. **Glass needs colour behind it.** Put a row of glass cards inside `.ui-glows` (one per view) or over the canvas wash. Glass over flat white is just grey.
2. **Glass for cards and chrome; solid for reading.** Tables, long prose and code go in `.ui-card--solid`. Never stack glass on glass more than once.
3. **One primary action per view**, as an ink pill (`.ui-btn--primary`). Everything else is glass or ghost.
4. **Amber is the one accent.** It marks the compiled route and at most one key number per view. Warnings are yellow, not amber.
5. **Route and outcome are different chips.** Route = how the ticket ran (explored violet, recalled teal, compiled amber). Outcome = what happened (resolved, needs human, fell back). Always glyph plus word, never colour alone.
6. **Numbers are tabular and right-aligned**, with units in the cell (`6.2 s`, `$0.07`). Cost with two decimals.
7. **Say what is missing.** No silent zeros. Unavailable data reads "Unavailable" with a reason; stand-ins are labelled (for example the Haiku router stand-in).
8. **Example data is labelled as example data.** Demo screens never present illustrative numbers as results.
9. **States are local.** Loading keeps the last good view with shaped skeletons; a failing panel shows its own retry; empty states say what is empty and offer one action.
10. **Accessible by construction.** AA text contrast on every surface (checked), 2px focus ring, 3:1 control borders, glass falls back to solid under `prefers-reduced-transparency`, `prefers-contrast: more`, or no `backdrop-filter`; motion stops under `prefers-reduced-motion`.

More: [foundations](design-system/FOUNDATIONS.md) · [components](design-system/COMPONENTS.md) · [UX](design-system/UX.md) · [sources](design-system/SOURCES.md).
