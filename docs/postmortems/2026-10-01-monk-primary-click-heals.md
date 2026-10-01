---
status: closed
classe: input-cross-platform
barreira: null
regressao:
  - tests/e2e/match/monk-heal.spec.ts
  - tests/unit/web/create-world-interaction-handler.test.ts
---

# Monk Primary Click Heals Instead of Selecting

## Summary

With a single Monk selected, a primary (left) click on a damaged allied unit
issued a `HEAL` command instead of changing the selection. The player could not
left-click to select another troop.

## Symptom

Left-clicking a damaged friendly unit kept the Monk selected and started a heal.
Players expected the left button to select units and the right button to give
the contextual heal order.

## Root cause

`handlePrimary` in `create-world-interaction-handler.ts` called
`controller.autoHealTarget()` before `updateSelection`, so the primary click
short-circuited selection and sent `HEAL`. The same auto-heal was already wired
into the secondary path through `unitCommand`.

## What we missed

The `monk-heal` browser test encoded the defect: it selected the Monk, then
left-clicked the ally and asserted the heal. No acceptance criterion protected
button semantics (left selects, right commands), so the regression test locked
in the wrong behavior.

## Fix

Removed the `autoHealTarget` early return from `handlePrimary` and dropped the
method from the `BuildPlacementController` handler contract. Healing remains
available on the secondary click path via `MatchInteractionController.unitCommand`,
which now owns the private auto-heal decision.

## Regression

`tests/e2e/match/monk-heal.spec.ts` asserts that a left click selects the ally
(health unchanged at 90 and the `Soldier #2` selection button appears) and that a
right click heals it to 115.

## Prevention

The regression now pins the button semantics for the Monk heal flow. Any future
primary-click change that heals must fail this browser test.

## Verification

- `tests/e2e/match/monk-heal.spec.ts` (chromium + firefox): PASS.
- `tests/unit/web/create-world-interaction-handler.test.ts`: PASS.
- `pnpm run verify`: PASS (typecheck, lint, unit 427, integration 25,
  simulation 127, contracts 23, orders 6, determinism 6, architecture 694,
  invariants 16, build).
- `pnpm run test:e2e:fast` non-economy failures re-run serially: 56/56 PASS;
  economy suite serial: 66/66 PASS.
