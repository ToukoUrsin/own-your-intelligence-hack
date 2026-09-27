# Visual foundations

## Direction

A compact, calm workbench. The user should see the current outcome and next
useful action before reading how the software got there. Group with whitespace
and hairlines. Give an independent tool, inspector or dialog a panel only when
the boundary explains the object.

## Color and material

| Role | Dark | Light | Token |
| --- | --- | --- | --- |
| Canvas | `#0A0A0B` | `#EDEBE7` | `--ui-bg` |
| Panel | `#111113` | `#F6F4F0` | `--ui-surface` |
| Overlay | `#1B1C1F` | `#FFFFFF` | `--ui-overlay` |
| Main text | `#EDEBE7` | `#15161A` | `--ui-fg` |
| Supporting text | `#A3A5AB` | `#50555E` | `--ui-muted` |
| Active / key figure | `#FF8A3D` | `#A5440D` | `--ui-accent` |

Use the JSON for all other values. Readable secondary text is separate from
disabled text. `line` separates content; `border-control` identifies an input
or actionable boundary. A decorative hairline is not sufficient to identify a
form field.

The app header uses warm paper in both themes. Main content uses the selected
theme. Keep interaction chrome neutral: a primary button uses ink/paper,
selection uses a neutral fill, and focus uses a visible neutral ring.

Amber marks active execution and at most one key figure in a work view. Yellow
means a decision needs attention; green means an evidenced successful result;
red means failure or a destructive action. Always include words. A saved-path
match is a method, not success. Avoid decorative gradients, glass blankets,
glowing dots, ornamental badges and a colored card for every metric.

## Typography

| Role | Face | Size token | Default weight |
| --- | --- | --- | --- |
| Interface | Funnel Sans | `text-body` · 14px at default root size | 400 |
| Reading | Funnel Sans | `text-reading` · 15px | 400 |
| Small labels | Funnel Sans | `text-small` · 13px | 500 |
| Captions / table heads | Funnel Sans | `text-caption` · 12.5px | 400 / 500 |
| Section title | Funnel Display | `text-section` · 20px | 400 |
| Page title | Funnel Display | `text-title` · 26px | 400 |
| A primary metric | Funnel Display | `text-metric` · 44px | 400 |
| IDs, data, code | Fragment Mono | body or small | 400 |

Use medium weight for controls and short labels. Do not bold every heading.
Use tabular numbers in metrics and aligned numeric cells. Include units in each
value: `2.1 s`, `USD 0.0042`, `3 calls`. Right-align comparable values; left-align
identifiers. Restrict body reading width to 65 characters without constraining
operational tables. Display tracking is -0.035em; body tracking stays normal.

## Geometry

Spacing uses a 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 and 96px.
Controls use a 6px radius; panels use 12px; small inline objects use 4px.
Default controls are 36px high in a dense desktop toolbar and 44px for forms
or coarse pointers. Do not reduce targets below their labels to save space.

The portable reference has a 1200px maximum with 16–48px responsive gutters.
A host dashboard may extend to the available width for real operational tables.
At 960px the inspector stacks under the table. At 560px the summary becomes
compact rows; method and duration columns move out of the list while remaining
available in the inspector. Request and outcome stay visible. Never hide
evidence without a reachable detail path.

## Motion and focus

Hover: 120ms. Ordinary transitions: 180ms. Larger state changes: at most 260ms.
Use `ease-out` and transition a specific property. A busy label must reflect
real work; there is no simulated progress bar. Acknowledge selection immediately
and keep the selected record stable during background work.

Use a 2px focus ring with a 2px offset. Preserve keyboard focus during row updates.
Reduced motion removes animation and transitions; it must not remove state or
layout geometry. Do not animate a background, hijack scrolling or introduce
continuous visual activity merely to make the screen feel alive.
