# Sources

Audited 27 September 2026 from the implemented code of recent projects. Values were read from files, not inferred from names or memory. Nothing here copies product code; the only copied binaries are the three OFL font files.

## Direction

An earlier dark-first "quiet workbench" system (hairline metric columns, no glass) was reverted in `4ca08b0`. The requested direction was **light theme, clean cards, liquid glass**. This system is built to that brief.

## What came from where

| Source | Checkout | Taken | Changed |
| --- | --- | --- | --- |
| **Factory Teksor** (`~/code/factory-teksor-worktrees/agent-margin-polish`, same styles as main and the 14 Sep UI/UX handoff) | `5b5db4c2`, styles last touched `53e077db` | Light-first theming; the `.liquid-glass` recipe (surface tint, `blur + saturate`, directional top-left specular and bottom-right bounce, soft cast); the app-window pane (≈0.76 alpha, 24px blur); elevation as contact + ambient shadow pairs; 0.5px inset hairlines; ink primary pill buttons, glass secondary; pill chips with tone pairs (violet, teal, green, red, yellow bg/fg values); motion tokens (120/180/260/340ms, `0.22,1,0.36,1` out, `0.32,0.72,0,1` spring); reduced-transparency and high-contrast fallbacks; UX rules on density, local failure, explicit missing data, success needing evidence, shaped skeletons | Factory limits glass to small surfaces and uses native system fonts. Here glass is the default card material (per the brief), with a solid variant for dense data, and the Funnel type family. Blue is no longer the accent; neutrals are warmed. |
| **Shardflux** (`~/code/agent-vm-SaaS`) | `1f7b0b5`, UI styles last touched `fa5720c` | Funnel Display / Funnel Sans / Fragment Mono and their self-hosted variable files; the type scale (11–44px) and display tracking; bone/ink palette (`#EDEBE7` / `#15161A`) and dark theme values; amber "molten" as the single accent (`#FF8A3D` dark, darkened for light); the glass card structure (masked 1px gradient rim, specular highlight, 16px radius, 20px padding); amber + cold-blue blurred glows behind a glass row ("glass needs something to refract"); 4px spacing grid; one-primary-per-view, sentence-case verbs, placeholder contrast, error copy without apologies | Shardflux is dark-first with glass only on summary cards and "no pills, no dots" status text. Here light is default, glass is the card material, and status uses chips with glyph + word because route and outcome need to be scannable in a table. Light shadows are re-derived from ink (Shardflux's derive from the page colour, which turns bone-coloured in light). |
| **Helios** (website + brand guidelines) | `~/code/helios-one-website`, Jul 2026 | Warm cream/panel neutrals as a reference point; "depth is a whisper" restraint; pills for actions; 120–260ms motion | Not ported: Hanken Grotesk / Geist and the lime or blue accents. |
| **anti-rot** | `ef27bc3` | The one light frosted precedent (`#e3e9d9f5` + 8px blur) confirmed light glass reads well with a tinted backdrop | Palette not ported. |
| **simulation-factory-os** | Jun 2026 | Light status bg/fg pairing pattern; card shadow shape | Cool Fiori blues not ported. |
| **teksor-mp-fps / spectator** | Sep 2026 | Directional glare highlight idea (top-left sheen) | Game HUD styling, fonts and zero radii not ported. |
| **This repo** | `STATUS.md`, `IDEA.md`, `PLAN.md`, `video/DEMO_TICKETS.md` | Route vocabulary (explored → recalled → compiled), outcomes, Paths panel contents, the stand-in router caveat | — |

`cnc-software` has system principles but no UI; nothing visual was taken.

## New in this system

- **Light liquid glass for cards.** No source had a light glass card with a rim and glows; it is composed from Factory's material and Shardflux's card structure, retuned for a light canvas (pane 64% alpha, 24px blur, 1.5 saturate, white spec 0.85).
- **Contrast checked on glass.** `build-tokens.mjs` composites each glass fill over the canvas and over each glow at full strength, and reports the worst case. It caught `fg-subtle` at 4.47:1 on chip glass over the warm glow, which is why that grey is `#5A5E66`.
- **Route palette.** Violet / teal / amber marks validated with the dataviz categorical checks in both themes.
- **Support-specific components.** Route and outcome chips, the step trace, the share meter.

## Licences

Funnel Display and Funnel Sans © The Funnel Project Authors; Fragment Mono © The Fragment-Mono Project Authors. SIL Open Font License 1.1, texts in `fonts/*-OFL.txt`. Files are Fontsource 5.3.0 Latin subsets.
