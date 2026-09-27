# Foundations

Values live in `tokens.json`; this page explains how to use them. Variables are `--ui-<group>-<name>`, e.g. `--ui-color-fg-muted`, `--ui-radius-lg`.

## Colour

Light is the default. Neutrals are warm and slightly lighter than Shardflux's bone; ink is near-black, not pure black.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `canvas` | `#F3F1EC` | `#0A0A0B` | Page. Always under the wash. |
| `surface` | `#FDFCFA` | `#131316` | Solid cards, inputs, selected segments. |
| `surface-sunken` | `#EDEBE6` | `#0E0E10` | Disabled fields, wells. |
| `fg` | `#15161A` | `#EDEBE7` | Primary text, primary button fill (light). |
| `fg-muted` | `#4F545C` | `#A6A9AF` | Labels, secondary text. |
| `fg-subtle` | `#5A5E66` | `#8E929A` | Meta, captions, placeholders (still AA). |
| `line` / `border` / `border-strong` | ink at 7 / 11 / 20% | bone at 8 / 13 / 26% | Dividers, card hairlines, hovered edges. |
| `border-control` | `#8A8D93` | `#6E727B` | Input and checkbox edges (3:1). |
| `accent` | `#E8702A` | `#FF8A3D` | Amber. Marks and fills only. |
| `accent-text` | `#A4460E` | `#FF9E5E` | Amber as text (the one key number). |
| `info` / `success` / `warning` / `danger` | `#0054DE` / `#006D32` / `#6B5500` / `#B00A1D` | lighter steps | Text/icon colour. Each has a `-soft` background. |

**Routes** have three steps each: text (`explored`), soft background (`explored-soft`) and mark (`explored-mark`) for bars, dots and chart series.

| Route | Meaning | Text on soft | Mark (light / dark) |
| --- | --- | --- | --- |
| Explored | Agent solved from scratch; path saved | violet | `#8B5CF6` / `#9466F0` |
| Recalled | Agent replayed a saved path | teal | `#0E9AAE` / `#1A9FB3` |
| Compiled | Deterministic program, no model calls | amber | `#E8702A` / `#DE6A22` |

The three marks pass the dataviz categorical checks (lightness band, chroma, colour-blind separation ΔE ≥ 11) in both themes. Keep them in this order everywhere: explored, recalled, compiled.

**Contrast.** Every text colour clears 4.5:1 on the surfaces it is used on, including glass composited over the canvas and over the strongest glow. Controls clear 3:1. `build-tokens.mjs --check` enforces this.

## Type

| Token | Size | Use |
| --- | --- | --- |
| `label` | 11px | Mono uppercase eyebrow, +0.08em |
| `xs` | 12px | Chips, table heads, hints |
| `sm` | 13px | Meta, secondary controls, mono data |
| `base` | 14px | Interface body, buttons, table cells |
| `md` | 15px | Card titles, reading text |
| `lg` | 17px | Lead paragraphs |
| `xl` / `2xl` / `3xl` | 20 / 26 / 34px | Dialog, page and section titles |
| `metric` | 44px | One number per card |
| `hero` | 44–72px fluid | Marketing or video title |

- **Geist** for everything: titles and numbers at 400 with tracking −0.025em (hero −0.04em) and line-height 1.02–1.1; body 400; 500 for labels, buttons and card titles. No bold headings. `--ui-font-display` and `--ui-font-body` are separate tokens so a display face can be swapped in later without touching components.
- **Geist Mono** for ticket IDs, tool names, canonical requests, code. Ligatures off. It is designed alongside Geist, so mono and sans share proportions and x-height.
- Tabular numbers wherever values stack (`.ui-num`, tables, metrics).

## Space, size, radius

- 4px grid: `space-1` 4 … `space-24` 96. Use `gap`, not margins, between siblings.
- Controls: `xs` 24 (chips), `sm` 28, `md` 36 (default), `lg` 44 (touch-first).
- Radius: `xs` 4 (skeleton, kbd), `sm` 6, `md` 10 (inputs, notices, compact cards), `lg` 16 (cards), `xl` 22 (dialogs), `pill` (buttons, chips, segmented, app bar).
- Layout: content max 1200px, reading 65ch, forms 32rem, gutter `clamp(16px, 4vw, 48px)`, bar 56px.

## Elevation

Each step is a tight contact shadow plus a soft ambient one, tinted with ink rather than pure black.

| Token | Use |
| --- | --- |
| `shadow-sm` | Selected segment, swatches |
| `shadow-md` | Cards at rest |
| `shadow-lg` | Hovered interactive cards, app bar |
| `shadow-xl` | Dialogs |

## Liquid glass

The material has five parts. All of them are tokens, so dark mode and fallbacks come free.

1. **Tint.** A translucent surface fill: `glass-pane` (cards, 64% in light), `glass-chip` (small controls, 50%), `glass-bar` (app bar, 66%).
2. **Frost.** `backdrop-filter: blur() saturate()`: 24px / 1.5 for panes, 10px / 1.7 for chips. Saturation lifts the colour coming through, which makes it read as glass rather than fog.
3. **Light.** From the top-left: a 1px inset specular (`glass-spec`) on the top and left edges, a weaker bounce (`glass-bounce`) bottom-right, a gradient rim (`glass-rim`, masked to 1px) and a top sheen (`glass-sheen`).
4. **Edge.** A 0.5px inset hairline in `border`, so the card holds its shape over pale areas.
5. **Cast.** `shadow-md`, or `glass-cast` for chips.

**Something to refract.** The canvas carries a fixed wash (`wash-canvas`: amber top-left, sky top-right, amber low centre over a 145° neutral gradient). For a row of cards, wrap them in `.ui-glows`, which places two blurred glows (`glow-warm`, `glow-cool`, 56px blur) behind the row. Without colour behind it, glass looks like a grey card.

**When not to use glass.** Dense tables, long prose and code go on `.ui-card--solid`: same shape, rim and shadow, opaque fill. Do not put glass inside glass more than once.

**Fallbacks.** With no `backdrop-filter`, or under `prefers-reduced-transparency: reduce` or `prefers-contrast: more`, every glass surface becomes `surface`. High contrast also swaps the hairline for a 1px `border-control` edge.

## Motion

- Durations: `fast` 120ms (hover, press), `base` 180ms (state, segment), `slow` 260ms (dialogs, meters), `fall` 340ms (larger moves).
- Easing: `ease-out` for entrances, `ease-in-out` for position changes, `ease-spring` for chrome that settles.
- Animate transform, opacity and colour only. Press = 1px down. Dialog rises 8px and scales from 0.98. Skeletons pulse at 1.4s.
- Everything goes to 0ms under `prefers-reduced-motion`.
