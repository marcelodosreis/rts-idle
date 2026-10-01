---
status: closed
classe: presentation
barreira: null
regressao:
  - tests/e2e/match/selection-box.spec.ts
  - tests/unit/web/command-state.test.ts
---

# Enemy Building Command Panel Empty

## Summary

Selecting an enemy construction displayed its information panel but left the command panel empty, unlike enemy unit selection which shows its actions as locked.

## Symptom

Players could not inspect the available actions of an enemy construction or see why those actions were unavailable.

## Root cause

`CommandBar` returned the empty command layout before building actions were created whenever the selected construction did not belong to the human player.

## What we missed

Selection coverage verified that constructions could be selected, but did not exercise the command panel for an enemy construction. The command HUD acceptance criteria covered locked enemy units but not locked enemy buildings.

## Fix

`CommandBar` now creates the selected building's normal root actions and attaches an enemy-ownership block reason to each action. `command-state.ts` centralizes that reason.

## Regression

`tests/e2e/match/selection-box.spec.ts` selects the enemy Castle and asserts its Train, Upgrade, and Rally actions are locked and explain the ownership restriction.

## Prevention

The browser regression covers the player-visible inspection and blocked-action path for enemy constructions.

## Verification

- `tests/e2e/match/selection-box.spec.ts` (chromium + firefox): PASS.
- `tests/unit/web/command-state.test.ts`: PASS.
- `pnpm run verify`: PASS.
- Economy E2E serial suite: 66/66 PASS.
