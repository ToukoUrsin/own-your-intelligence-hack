# Component contracts

The shared CSS handles appearance. Native elements or the host's established
accessible primitives own semantics and behavior. `reference/` demonstrates
the shared styles directly; it is not an application component dependency.

## Shell and navigation

Use `.ui-bar` / `.ui-bar-inner` for the warm header, `.ui-nav` for a labeled
navigation landmark, and `.ui-page` for the content rhythm. `aria-current="page"`
belongs only on the active destination. Section links in the reference are real
anchors, not a fake router. Use `.ui-skip` for the first keyboard stop.

Prefer three to five destinations. Add a sidebar only when actual navigation
depth requires it. Keep a support answer's reading width local to its content.

## Buttons

```html
<button class="ui-button ui-button--primary" type="button">Review request</button>
<button class="ui-button" type="button">Inspect trace</button>
<button class="ui-button ui-button--danger" type="button">Delete saved path</button>
```

Use one primary action in the current decision area. Labels state the action.
Use links for destinations and buttons for actions. Native `disabled` prevents
activation; `aria-disabled` alone does not. State why a necessary action is
unavailable. While submitting, keep the label specific, set `aria-busy="true"`,
prevent duplicate submissions and expose completion or failure beside the work.
Only show a success message after the owned operation confirms its result.

## Inputs and validation

```html
<div class="ui-field">
  <label for="ticket-title">Request title</label>
  <input class="ui-input" id="ticket-title" required
    aria-invalid="true" aria-describedby="title-error">
  <p class="ui-field-error" id="title-error">Enter a request title.</p>
</div>
```

Keep a persistent label. A placeholder supplies an example, never a label.
Validate on submission or after interaction. Preserve the user's input and
focus the first invalid field. Link help and errors with `aria-describedby`.
Clear obsolete errors when the application validates a corrected value.

Use native select, checkbox, date and numeric controls or established accessible
host primitives; don't replace them with clickable divs. A blank numeric field
remains missing. It does not become zero on blur.

## Filter groups

`.ui-filter` contains ordinary buttons in a named `role="group"`. Set
`aria-pressed` to represent the active filter and announce the result count in
a polite status region. These buttons filter the same list; they are not ARIA
tabs and do not need a made-up arrow-key convention. For actual tab panels,
reuse the host's tab primitive with its keyboard contract.

## Tables and selection

Use a real `<table>` with `<caption>`, column `<th scope="col">` elements and
proper cells. `.ui-number` aligns quantities; `.ui-secondary-column` hides only
secondary columns at the compact breakpoint. Every hidden value must remain
in the inspector. Scope horizontal scrolling to `.ui-table-wrap` when a genuine
wide table needs it.

Put a `.ui-row-button` inside the identifying cell; don't make a whole `<tr>`
pretend to be a button. `aria-pressed` and `data-selected` follow the same
selected record ID. Preserve focus when the inspector updates. The reference
keeps the last inspected record when filtering produces no rows and labels it
“Last inspected run.” It never silently shows that record as a matching result.

## Status, notices and missing data

Use `.ui-status` with `data-status="running|resolved|review|failed|replayed"`.
The neutral default also covers queued, stale or unavailable text. The label is
required; color does not establish semantics. This class styles a display state,
not a backend state machine. See [UX.md](UX.md) for evidence requirements.

`.ui-notice`, `--warning` and `--error` present a short local reason and next
step. Use `role="alert"` only for newly appearing urgent errors, not every
rendered message. Use `.ui-empty` for an actual empty collection or no matches;
distinguish those conditions from a failed read.

## Inspector, disclosure and dialog

`.ui-panel` groups one inspector. `.ui-facts` pairs real terms and values.
Native `<details class="ui-details">` makes secondary evidence available without
adding another screen or hiding the result itself.

Use `<dialog class="ui-dialog">` and `showModal()` for a true modal. Give it an
accessible title, initial focus, a visible Close button, Escape dismissal and
focus restoration to its opener. The reference uses the browser's modal focus
containment. Opening a trace should not submit a customer action.

For irreversible product actions, the host owns target-specific confirmation,
permissions and the resulting receipt. A red button is not an authorization
mechanism. Confirmation must name the affected object and actual consequence.

## Code and icons

Use `.ui-code` for a horizontally scrollable code object. Copy controls need
an accessible name and a real clipboard result or an honest fallback. The
reference's copy control follows that contract.

Prefer labels. When an icon helps, use one consistent 16px stroke family with
`currentColor`; keep an accessible name on the control. Do not import another
project's logo or use a decorative avatar to suggest a second assistant identity.
