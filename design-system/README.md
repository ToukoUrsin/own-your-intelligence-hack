# Own Your Intelligence UI

A portable design foundation for the support agent and its QM dashboard.
Adapted from recent work in Shardflux, Factory Teksor and the CNC foundation.
No framework, package install, hosted fonts or backend is required to inspect it.

## Quick start

From the repository root:

```sh
node design-system/build-tokens.mjs --check
python3 -m http.server 4173 --bind 127.0.0.1 --directory design-system
```

Open `http://127.0.0.1:4173/reference/`. The reference has dark/light switching,
run filters, search, selection, a native dialog, a copy control and form validation.
Its four example runs are explicitly fictional. Their times are specimen values,
not evidence of a working agent, a trained model or cheaper execution.

## Files and ownership

| File | Purpose |
| --- | --- |
| `tokens.json` | Editable source of truth; CSS-ready strings grouped into global tokens, themes and breakpoints |
| `build-tokens.mjs` | Generate exports; check theme parity, reference integrity, breakpoints and contrast |
| `tokens.css` | Generated CSS custom properties; `--ui-` namespace |
| `tokens.ts` | Generated typed values, `Theme`, `TokenName`, and `cssVar()` |
| `index.css` | Convenient entry point for fonts, tokens, base and components |
| `fonts.css`, `fonts/` | Three locally served Latin font subsets with original SIL license notices |
| `base.css` | Opt-in `.ui-root` base styles, focus and reduced-motion behavior |
| `components.css` | Shared shell, controls, fields, tables, notices, details and dialog styling |
| `reference/` | Real rendered component reference; example data and reference-only interactions |
| `FOUNDATIONS.md` | Visual decisions and token roles |
| `COMPONENTS.md` | Markup, behavior and accessibility responsibilities |
| `UX.md` | Workflow state, evidence, empty/error/loading and copy contracts |
| `SOURCES.md` | Audited source files, revisions and deliberate adaptations |

## Use in an application

For a plain HTML app, link `design-system/index.css`. For a bundler:

```css
@import './design-system/index.css';
```

Scope the system and place the theme on the **same element**:

```html
<div class="ui-root" data-theme="dark">
  <main class="ui-page">
    <h1 class="ui-title">Support runs</h1>
    <button class="ui-button ui-button--primary" type="button">Review request</button>
  </main>
</div>
```

`data-theme="light"` switches the semantic palette. Dark is the default.
The reference remembers the choice in local storage; a host application owns
its own theme persistence and first-paint setup. Place portals such as dialogs
inside the themed root or give their root the same class and theme.

React needs only normal class names; no React runtime is bundled here:

```tsx
import './design-system/index.css';
import { cssVar, type Theme } from './design-system/tokens';

export function SupportPanel({ theme }: { theme: Theme }) {
  return (
    <section className="ui-root ui-panel" data-theme={theme}>
      <h2 className="ui-heading">Saved paths</h2>
      <p style={{ color: cssVar('muted') }}>Review the evidence before reuse.</p>
    </section>
  );
}
```

For the QM fork, carry `design-system/` into its asset/source tree and import the
CSS from the dashboard entry. Apply `.ui-root` at the dashboard boundary. Reuse
QM's existing accessible controls where they already own keyboard and focus
behavior; map their styling to these semantic variables. Do not mount a second
router, chat, authentication system or global reset for this package.

If the host already owns fonts or resets, import `tokens.css` and
`components.css` separately. `tokens.css` defines defaults at `:root`; the
`--ui-` prefix avoids overwriting a host's variables. Component styling is opt-in
through `ui-*` classes. No `@layer` dependency or Tailwind version is required.

## Change a token

Edit `tokens.json`, then run:

```sh
node design-system/build-tokens.mjs
node design-system/build-tokens.mjs --check
```

Commit the JSON, generated CSS and generated TypeScript together. This is a
small project-specific format, not a claim of DTCG interchange compatibility.
Token names map directly to CSS: `themes.dark.accent` becomes `--ui-accent`.
Use semantic values in components rather than raw colors. Breakpoints are
35rem and 60rem; media query literals are checked against the JSON because CSS
variables cannot supply media-query conditions.

The checker verifies 70 defined color pairs, including text on canvas, panels
and overlays, primary buttons, the light header, input borders and focus rings.
It does not certify every possible composition. Disabled controls and decorative
dividers are excluded from text-contrast guarantees. Render changed states
before shipping; see the acceptance checklist in [UX.md](UX.md).

## Fonts and licensing

Funnel Display, Funnel Sans and Fragment Mono are copied without modification
from the already installed Fontsource **5.3.0** packages used by Shardflux.
The three original notices live beside the WOFF2 files. They are SIL Open Font
License assets; keep the notices with redistribution. Latin subsets cover this
English reference. Add the appropriate licensed subsets for other writing
systems; the system font fallback remains available while fonts load.

No source-project logo, customer records, screenshots, backend or brand-specific
terminology is included. The implementation here was written for this project.

## Validation record · 27 September 2026

The actual `/reference/` page was inspected in the browser in both themes and
at desktop, 390px and 320px widths. Narrow layouts had no horizontal page
overflow; method, duration and tool counts remained available in the inspector.
The example values were four runs, two saved paths and a 9.75s median.

Keyboard checks covered filtering to two saved-path runs and one review run,
search with no matches, clearing filters, selection, native dialog Escape and
focus return, invalid/valid form states and successful clipboard feedback.
Generated exports, 70 contrast pairs, JavaScript syntax, local asset references
and unique/linked HTML IDs passed. No browser console errors were reported.

Automated pointer activation in the in-app browser could not be confirmed;
keyboard activation and DOM hit targets were checked. Reduced-motion rules are
implemented but OS preference emulation was not exercised. This record does
not claim screen-reader certification, deployed QM integration or live agent
outcomes.
