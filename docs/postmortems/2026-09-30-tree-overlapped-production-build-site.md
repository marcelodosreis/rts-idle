---
status: open
classe: presentation
barreira: QH.25
regressao:
  - tests/e2e/economy/production-playable.spec.ts
  - tests/e2e/match/hud-order-states.spec.ts
---

# Tree overlapped production build site

## Summary

New competitive-map trees intercepted browser clicks used by established
production and Patrol flows. Players could no longer place a Barracks at its
regression-map location or send a worker to the first Patrol destination.

## Symptom

The production flow timed out waiting for a Barracks construction, and Firefox
reported an ordinary Move/Idle state instead of Patrolling.

## Root cause

Natural-resource placement was added without checking established browser
scenario targets. Resource hit testing correctly has priority, so a tree at
`(12, 10)` prevented placement and a tree at `(18, 10)` classified the Patrol
ground target as a resource interaction.

## What we missed

The natural-resource slice ran its focused E2E test but did not run existing
cross-feature browser scenarios before the complete E2E gate. The map
placement acceptance criteria did not explicitly preserve interactive
regression targets.

## Fix

Moved both baseline trees to free tiles `(20, 10)` and `(21, 10)` in
`packages/game-data/src/maps/competitive.ts`, and updated the wood E2E flow's
tree location in `tests/e2e/economy/economy-playable.spec.ts`.

## Regression

`tests/e2e/economy/production-playable.spec.ts` permanently exercises the
Barracks placement at tile `(12, 10)`, and
`tests/e2e/match/hud-order-states.spec.ts` sends Patrol to `(18, 10)` in the
default scenario. Both fail when a selectable resource intercepts the command.

## Prevention

The full browser E2E gate is required for map-content changes. The production
placement flow remains a permanent cross-feature map-compatibility check.

## Verification

Reproduced with `E2E_WORKERS=1 pnpm run test:e2e -- --project=chromium
--project=firefox --grep-invert @perf --max-failures=1`. Focused production and
wood browser flows, then the completion gates, are run after this fix.
