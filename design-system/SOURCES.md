# Source audit and design decisions

Reviewed 27 September 2026. Recent Codex project activity identified Shardflux
and Factory Teksor as the useful implemented UI references. Source files were
read directly; recommendations are not guesses based on project names.

## Audited sources

| Source | Files and identity | Contribution |
| --- | --- | --- |
| Shardflux (`agent-vm-SaaS`) | `brand/tokens.css`, `docs/DESIGN_SYSTEM.md`, `apps/web/src/styles/{global,derived,fonts}.css`, `apps/web/src/ui/{Button,Table,Field}/*`; commit `8e15b7449aa8b8f1065167b51a8c5943c3832da2` | Near-black / bone palette, warm app header, restrained amber, Funnel / Fragment type, four-pixel rhythm, compact controls, explicit labels, sparse panel boundaries |
| Factory Teksor | `DESIGN.md`, `styles/{tokens,theme,surfaces}.css`; `origin/main` snapshot `5b5db4c23e387fde9ea759416304a6ac1145c3c3` | Semantic tokens, regular-weight hierarchy, dense decision views, immediate interaction, retained data, local failure, explicit missingness, responsive evidence access |
| CNC software | Local `FOUNDATION_PRINCIPLES.md`, read on review date; uncommitted document with no repository commit | Typed facts, source links, reported/estimated/confirmed distinctions, owner and next action for unresolved work |
| This repository | `IDEA.md`, `PLAN.md`, `CANONICAL_REQUEST_V1.md`, `agent/src/agent.ts`; base `22c771f` | Support workflow, QM dashboard boundary, canonical-request meaning and current trace limitations |

The Shardflux audited implementation files were clean at that commit. Its
working `brand-identity.md` contains older or conflicting color/state language;
the implementation and `docs/DESIGN_SYSTEM.md` were used for UI decisions.
Factory Teksor's primary checkout was older than its fetched main; the audited
design contract and token values came from the named main snapshot. CNC is a
UX/data source only and has no implemented visual system to claim as evidence.

The recent `demo-agent-project` is a command-line SDK demonstration and offered
no implemented UI to inherit. The FPS project has a different interaction
context, so game HUD conventions do not drive a support dashboard.

A public Shardflux browser read returned `ERR_BLOCKED_BY_CLIENT`; no claim is
made that its deployed UI was visually reviewed. This audit is grounded in
the listed implementation files. The local reference in this package is the
surface to render for review of the new system.

## Reconciliation, not a blanket copy

| Source difference | Decision here |
| --- | --- |
| Shardflux uses branded fonts; Factory uses native system fonts | Keep the more distinctive recent Funnel / Fragment family, self-hosted with system fallbacks |
| Shardflux has 44px glass summary cards; Factory discourages decorative KPI grids | Use simple metric columns with hairline separators; no default blur, glows or glass |
| Factory has a larger status palette and domain-specific badges; Shardflux favors plain status text | Use plain labeled states for support work, separate method from outcome, reserve semantic colors |
| Shardflux has low-contrast dim labels and a brighter light-theme amber | Raise secondary-text contrast and darken the light accent; validate the actual foreground/background pairs |
| Source products differ in focus treatment | Use a consistent 2px visible ring and independently legible control borders |
| Factory has extensive surface effects, animation and console machinery | Keep only the styles and interaction contracts needed for this portable package |
| Factory's app uses full workspace width; Shardflux uses 1200px | Reference max is 1200px; an operational host may use full available width while prose stays locally constrained |
| Source workspace states differ from support states | Define support execution, method and outcome separately; do not import VM or manufacturing state names |

## Transfer boundary

New implementation files were written here from the learned design patterns.
The only copied binaries are three unmodified Fontsource 5.3.0 Latin font
subsets, accompanied by their original SIL notices. No source-product logos,
private records, customer screenshots, secrets, service code or deployment
configuration are part of the transfer.

The result is a foundation for the current hackathon work. It does not port
either previous application, replace the QM chat, or claim that the example
support runs have occurred.
