# design-system

Portable UI kit for Support AGI: tokens, CSS components, fonts, docs and a runnable reference. Plain CSS custom properties, so it works in the QM fork, a Vite app, a static page or a video card. No build step for consumers.

```sh
node design-system/build-tokens.mjs --check        # tokens in sync + 60/60 contrast pairs
python3 -m http.server 4173 --bind 127.0.0.1 --directory design-system
# open http://127.0.0.1:4173/reference/   (?theme=dark for the dark theme)
```

## Files

| File | What it is |
| --- | --- |
| `tokens.json` | **Source of truth.** Base scales plus `light` and `dark` themes: colour, glass, glow, shadow, wash. |
| `build-tokens.mjs` | Writes `tokens.css`, `tokens.ts`, `tailwind.theme.css`; `--check` verifies they are current and runs WCAG contrast on the pairs listed in `tokens.json` → `checks`. |
| `tokens.css` | Generated custom properties, `--ui-*`. Light on `:root`, dark on `[data-theme="dark"]`, OS-following on `[data-theme="system"]`. |
| `tokens.ts` | Generated typed tokens and `cssVar("color", "accent")`. |
| `tailwind.theme.css` | Generated Tailwind v4 `@theme inline` mapping. |
| `fonts.css`, `fonts/` | Self-hosted Geist and Geist Mono (variable 100–900), Latin subsets, SIL OFL. |
| `base.css` | Canvas wash, type defaults, focus ring, `[hidden]`, `.ui-num`, `.ui-visually-hidden`. |
| `components.css` | Glass material, cards, bar, buttons, segmented control, chips, metric, meter, fields, table, steps, empty/skeleton/notice, dialog, kbd, fallbacks. |
| `index.css` | Imports fonts → tokens → base → components. |
| `reference/` | Specimen: a Paths dashboard with example data, component sheet and token sheet. |

## Docs

- [../DESIGN.md](../DESIGN.md): the one-page contract. Start there.
- [FOUNDATIONS.md](FOUNDATIONS.md): colour, type, space, radius, elevation, the glass recipe, motion.
- [COMPONENTS.md](COMPONENTS.md): class contracts with markup.
- [UX.md](UX.md): states, missing data, routes vs outcomes, copy, accessibility.
- [SOURCES.md](SOURCES.md): which recent project each decision came from, and what changed.

## Integrating

**Plain HTML / any framework.** Link `index.css` (or import it from your entry CSS). Set `data-theme` on `<html>` only if you want dark or OS-following; light needs nothing.

**Tailwind v4.** After `@import "tailwindcss";` import `index.css` and `tailwind.theme.css`. Utilities resolve to the same variables, so `bg-surface`, `text-fg-muted`, `border-border`, `rounded-lg`, `shadow-md`, `font-display` follow the theme.

**React / TypeScript.** Components are class contracts, not a React library: `<span className="ui-chip ui-chip--compiled">`. For values in JS (charts, canvas, video frames) read `tokens.themes.light.color.compiledMark` or use `cssVar("color", "compiled-mark")` in inline styles.

**Paths in a copied location.** `fonts.css` uses paths relative to itself; keep `fonts/` next to it.

## Changing a token

1. Edit `tokens.json`.
2. `node design-system/build-tokens.mjs`. It prints every contrast pair; a `FAIL` exits 1.
3. Look at the reference in both themes. A passing ratio is not a rendered check.

Add a new text/background pairing to `checks` whenever a component puts one colour on another.
