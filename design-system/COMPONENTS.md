# Components

Class contracts from `components.css`. The reference page (`reference/index.html`) shows each one rendered; copy markup from there. Icons are 24-grid line icons, 2px stroke, round caps (Lucide style), 16px in buttons, 13px in chips.

## Surfaces

| Class | Use |
| --- | --- |
| `.ui-card` | Default container. Glass pane, 16px radius, 20px padding, 16px gap, rim + sheen + `shadow-md`. |
| `.ui-card--solid` | Same card, opaque. Tables, prose, code. |
| `.ui-card--flush` | No padding (tables edge to edge); its `__header` gets padding and a divider. |
| `.ui-card--compact` | 16px padding, 10px radius. Dense grids. |
| `.ui-card--interactive` | Hover lifts 1px to `shadow-lg`; press settles. Needs `tabindex="0"` or to be a link/button. |
| `[aria-selected="true"]` / `[aria-current="true"]` | Selected card: 1.5px ink ring. |
| `.ui-card__header`, `__title`, `__meta`, `__footer` | Title 15px/500; meta 13px subtle; footer pinned to the bottom with a divider. |
| `.ui-glass` | The bare chip-strength material, for custom small surfaces (tooltips, floating toolbars). |
| `.ui-glows` | Wrapper that paints two blurred glows behind its children. One per view. |
| `.ui-bar` | Floating pill app bar, sticky 12px from the top. `__brand` (with `<small>` for the tenant), `__spacer`. |

```html
<section class="ui-glows" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1rem">
  <article class="ui-card">
    <div class="ui-metric">
      <span class="ui-metric__label">Cost per ticket</span>
      <span class="ui-metric__value">$0.07</span>
      <span class="ui-metric__delta" data-good="true">62% vs no memory</span>
    </div>
  </article>
</section>
```

## Actions

| Class | Use |
| --- | --- |
| `.ui-btn` | Pill, 36px. Alone it is a text button. |
| `--primary` | Ink fill. One per view. |
| `--glass` | Secondary. Chip-strength glass with a stronger hairline. |
| `--ghost` | Tertiary; hover tint only. |
| `--danger` | Destructive text; confirm in a dialog. |
| `--sm` / `--lg` / `--icon` | 28px / 44px / square. `--icon` needs `aria-label`. |
| `.ui-segmented` | Pill track; `button[aria-pressed="true"]` gets a solid thumb. Use for filters and view switches of 2–5 options. |

Labels are sentence-case verbs: "Approve refund", "Run replay", "Clear search". Disabled buttons stay visible at 45% and say why nearby.

## Status

| Class | Use |
| --- | --- |
| `.ui-chip` | 24px pill, 12px/500. Neutral by default. |
| `--explored` / `--recalled` / `--compiled` | Route chips. |
| `--success` / `--warning` / `--danger` / `--info` | Outcome and notice tones. |
| `--dot` | Leading dot in the mark colour, for legends. |
| `--glass` | Chip on glass (e.g. over a chart). |

Always glyph + word:

```html
<span class="ui-chip ui-chip--compiled"><svg>…</svg>Compiled</span>
<span class="ui-chip ui-chip--success"><svg>…</svg>Resolved</span>
```

Route glyphs in the reference: compass (explored), history arrow (recalled), braces with a check (compiled). Outcomes: check-circle (resolved), person (needs human), triangle (fell back).

## Data

| Class | Use |
| --- | --- |
| `.ui-metric` + `__label`, `__value` (`<small>` for the unit), `__delta` | One number. `__value--accent` for the single key number in a view. `__delta[data-good="true|false"]` colours the change by whether it is good, not by its sign. |
| `.ui-meter` + `<span data-route="…" style="flex-grow:N">` | Thin share bar with 2px gaps. Give it `role="img"` and an `aria-label` with the numbers. |
| `.ui-table` in `.ui-table-wrap` | Head 12px/500 subtle, 52px rows, hairlines, hover tint, `tr[aria-selected="true"]`. `.ui-num` / `[data-align="end"]` right-aligns tabular numbers; `.ui-mono` for IDs. The wrap scrolls horizontally on small screens. |
| `.ui-steps` | Ordered tool-call trace with numbered nodes and a connector. `<li>` holds `.ui-steps__tool` (mono) with optional `.ui-steps__note`, then an optional `.ui-steps__time`. `li[data-state="failed"]` marks the node red; `"skipped"` strikes the tool. |
| `.ui-eyebrow` | 11px mono uppercase label above a title. |
| `.ui-kbd` | Key hint. |

## Forms

```html
<label class="ui-field">
  <span class="ui-field__label">Recall threshold</span>
  <input class="ui-input" aria-invalid="true" aria-describedby="thr-err" />
  <span class="ui-field__error" id="thr-err">Use a value between 0 and 1.</span>
</label>
```

Labels sit above inputs. Placeholders are example values, never the label. `ui-field__hint` explains format; `ui-field__error` says what to do. `textarea.ui-input` grows vertically.

## Feedback

| Class | Use |
| --- | --- |
| `.ui-empty` | Dashed box: `<strong>` what is empty, one sentence why, one action. |
| `.ui-skeleton` | Shaped placeholder bar; set its width. Use several to echo the real layout. |
| `.ui-notice` + `--info` / `--warning` / `--danger` | Inline message with a tinted icon; the surface stays neutral. |
| `dialog.ui-dialog > .ui-card` | Native `<dialog>`, glass card, blurred light scrim, rises in. Close on Escape (native), on the backdrop, and with an explicit button. |

## Charts

Use the route marks in fixed order (explored, recalled, compiled). Thin columns with 2px surface gaps between stacked segments, recessive gridlines (`line`), axis text in `fg-subtle` at 11px, direct labels beside the last column, a legend of `--dot` chips, a hover tooltip on `.ui-glass`, and a "View as table" disclosure. Draw at the container's real width so text stays at its CSS size. Read colours from CSS variables at render time so the theme switch repaints them.
