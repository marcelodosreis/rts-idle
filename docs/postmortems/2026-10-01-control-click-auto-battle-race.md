---
status: open
classe: coverage
barreira: null
regressao:
  - tests/e2e/match/control-click-attack.spec.ts
---

# Control-Click Attack Auto-Battle Race

## Summary

The Chromium functional E2E pipeline intermittently timed out in the right-click
attack test because the test used the offensive 8v8 scenario while trying to
control the same units manually.

## Symptom

The test observed the enemy health at 100 for the full polling timeout after the
right-click, while the equivalent Firefox test passed.

## Root cause

`aggression=offensive` starts the scenario's automatic enemy engagement. The
test waited for positions and health to settle, stopped the player units, and
then clicked a target whose position could still change during the interaction.
Under Chromium CI load the click could miss the moving target or the selected
units could lose the engagement before the assertion.

## What we missed

The test covered a manually issued ATTACK command but did not isolate the
encounter from the scenario's seeded orders. The existing HUD command race
postmortem identified this pattern, but the control-click test retained the
offensive scenario.

## Fix

The right-click attack test now loads the passive 8v8 scenario. The test itself
is therefore the only source of the attack order while preserving the same
selection and damage assertions.

## Regression

`tests/e2e/match/control-click-attack.spec.ts` asserts that a right-click on a
stationary enemy damages it and preserves the selected player units.

## Prevention

Interactive E2E tests must use passive scenarios when they need to control the
timing and target of a command. Offensive scenarios remain for visual and
automatic-combat coverage.

## Verification

- `pnpm run test:e2e:focused tests/e2e/match/control-click-attack.spec.ts --project=chromium --grep "right-clicking"`
