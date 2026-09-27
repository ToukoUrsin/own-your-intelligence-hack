# UI / UX system

Start with [design-system/README.md](design-system/README.md). The reusable files,
source decisions and runnable reference live together in [design-system/](design-system/).

The direction is a quiet, compact workbench: near-black or warm paper surfaces,
regular-weight titles, readable data, subtle dividers and one meaningful amber
accent. It draws from the recent Shardflux UI, Factory Teksor console, and CNC
foundation. [Source decisions](design-system/SOURCES.md) distinguish inherited
patterns from changes made for this project.

Use these files when building the QM dashboard described in [PLAN.md](PLAN.md).
This package supplies a visual language and interface contracts; the reference
is an interactive component specimen, not a connected support application.

```sh
node design-system/build-tokens.mjs --check
python3 -m http.server 4173 --bind 127.0.0.1 --directory design-system
```

Open `http://127.0.0.1:4173/reference/`.

- [Tokens and integration](design-system/README.md)
- [Visual foundations](design-system/FOUNDATIONS.md)
- [Component contracts](design-system/COMPONENTS.md)
- [Support workflow UX](design-system/UX.md)
- [Source audit](design-system/SOURCES.md)

The shared system owns colors, typography, spacing, radii and motion. Product
code owns data, permissions, persistence, navigation and the meaning of each
state. Keep those boundaries intact when using the files in another frontend.
