---
status: open
classe: input-cross-platform
barreira: null
regressao:
  - tests/e2e/match/hud-order-states.spec.ts
---

# Duplicate Secondary Commands

## Summary

A single right-click could emit two authoritative commands. An armed Patrol or
Attack-move order was immediately overwritten by a plain MOVE, leaving the unit
moving or idle instead of patrolling or attack-moving.

## Symptom

The HUD order-state E2E intermittently failed with the selected unit reporting
`Status Moving` or `Status Idle` after an armed Patrol/Attack-move right-click,
even though the command had been sent and the armed instruction had cleared.
The failure clustered under CPU load and was rarely reproducible in isolation.

## Root cause

`packages/renderer/src/input/world-input-adapter.ts` emitted `secondary-activate`
from three separate DOM paths: `pointerdown` (button 2), `mousedown` (button 2),
and `contextmenu`. Deduplication relied on wall-clock windows (50 ms between
pointer/mouse events, 500 ms before contextmenu). Browser input events are
dispatched as independent tasks, so under load the gap between `pointerdown` and
`mousedown` can exceed 50 ms. A single physical right-click then emitted two
`secondary-activate` interactions. The first sent PATROL/ATTACK_MOVE and cleared
the armed mode; the second, with the mode already idle, sent MOVE and replaced
the order.

## What we missed

The original order-state E2E had retry/fallback blocks that re-armed the mode and
re-clicked until the expected text appeared, which masked the duplicate command
instead of exposing it. The test also accepted `tick > 0` as readiness instead of
a fully presented frame, adding unrelated racing.

## Fix

`WorldInputAdapter` now has a single secondary emitter: `pointerdown` with
button 2 emits `secondary-activate` exactly once per gesture. The redundant
`mousedown` handler and the time-window bookkeeping were removed, and
`contextmenu` only calls `preventDefault()` to keep the native browser menu from
appearing.

## Regression

`tests/e2e/match/hud-order-states.spec.ts` now asserts that an armed Patrol and
an armed Attack-move persist on the selected unit, without retry loops or
fallback clicks. The test fails when a duplicate secondary command follows the
armed order and passes with the single-emitter fix.

## Prevention

Secondary input must have exactly one emitter per gesture; time-based dedupe
across multiple DOM event paths is not accepted. Armed-order E2E must assert the
resulting order state directly and must not re-click until it passes.

## Verification

- `pnpm run test:e2e:focused` on `hud-order-states`, `selection-feedback`,
  `select-and-move`, `hud-commands`, and `control-click-attack` — 24 passed
  across Chromium and Firefox.
- `pnpm --filter @rts/renderer typecheck` — passed.
