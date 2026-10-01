---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/economy/production-playable.spec.ts
---

# Supply Delta Displayed Reservations

## Summary

The Supply HUD displayed `+1` as soon as a unit was queued, even though the unit had not completed training and had not consumed used supply.

## Symptom

Training a unit caused an immediate Supply delta instead of showing the delta after the unit spawned.

## Root cause

The TopBar combined deltas from used supply, reserved queue supply, and supply capacity. A training command increases reserved supply immediately, which incorrectly drove the player-facing used-supply delta.

## What we missed

The HUD delta tests covered resource refunds and completion feedback but did not distinguish queue reservation from completed unit supply consumption.

## Fix

`apps/web/src/features/match/ui/TopBar.tsx` now derives the Supply delta exclusively from authoritative `usedSupply`.

## Regression

`tests/e2e/economy/production-playable.spec.ts` verifies no Supply delta while training is active and verifies `+1` after the unit spawns.

## Prevention

Resource deltas must use the authoritative field represented by their visible value; hidden reservation fields cannot be combined into player-facing consumption feedback.

## Verification

- Focused train-to-spawn E2E passed in Chromium and Firefox.
- `pnpm run verify` passed.
- `pnpm run test:e2e:fast` exceeded its four-minute local timeout while unrelated parallel suites were failing; the focused affected path passed in both supported browsers.
