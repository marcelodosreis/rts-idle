# AUTH-015 — Visual timing and health authority

**Status:** done

## Task

- Objective: centralize animation-speed and HP presentation calculations.
- Scope: renderer, sprite lab, stress view, unit tests.
- Non-goals: changing Pixi 60 FPS baseline or presentation colors.

## Read first

`packages/renderer/src/visual-timing.ts`, renderer consumers, sprite lab and stress view tests.

## Contract

FPS/Pixi conversion and HP ratios/classification each have one presentation helper with defined invalid-duration behavior.

## Tests and validation

Focused renderer tests; `pnpm run test:unit`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [ ] Existing visual parity is retained at 60 FPS and threshold edges are tested.

## Completion report

Report PASS/BLOCKED, evidence, changed files, and architecture impact.
