---
status: open
classe: input-cross-platform
barreira: QH.05
regressao:
  - tests/e2e/match/hud-order-states.spec.ts
---

# Duplicate Secondary Command

## Summary

A delayed browser `contextmenu` event caused one right-click to issue two commands. The second command ran after the command mode had been cleared and replaced the intended Patrol or Attack-move order with a normal Move order.

## Symptom

The HUD intermittently showed `Moving` or `Idle` instead of `Patrolling` or `Attack-moving` after a right-click command. The failure was reproducible in Chromium when rendering work delayed the browser event sequence.

## Root cause

`WorldInputAdapter` emitted secondary input from pointer-down and also from `contextmenu`, suppressing the second event only with a 500 ms timestamp window. A delayed `contextmenu` could arrive after that window, so it emitted a duplicate command after the first command had cleared the pending mode.

## What we missed

The browser test covered the command state but did not assert that one physical right-click produced exactly one command. The timestamp-based suppression was not tested under delayed rendering/event delivery.

## Fix

`packages/renderer/src/input/world-input-adapter.ts` now treats the `contextmenu` event following a secondary pointer-down as a duplicate gesture, regardless of elapsed time. The redundant mouse-down fallback was removed because modern browser input is normalized through pointer events.

## Regression

`tests/e2e/match/hud-order-states.spec.ts` now fails before this fix when a right-click is duplicated and passes only when Patrol and Attack-move remain the active orders.

## Prevention

The E2E command-state flow remains in the Chromium and Firefox full browser gates. Secondary input deduplication is now event-based rather than time-based, so rendering latency cannot reopen this failure mode.

## Verification

- `pnpm exec vitest run tests/unit/renderer tests/unit/web` — 211 passed.
- `CI=1 E2E_WORKERS=1 pnpm run test:e2e -- tests/e2e/match/hud-order-states.spec.ts --project=chromium --project=firefox --grep-invert @perf` — 2 passed.
