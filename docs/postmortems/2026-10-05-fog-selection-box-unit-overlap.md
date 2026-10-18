---
status: open
classe: coverage
barreira: null
regressao:
  - tests/e2e/match/selection-box.spec.ts
---

# Fog Selection Box Unit Overlap

## Summary

The enemy-construction selection regression still showed the worker panel after
the enemy Castle was revealed. The reveal interaction placed the worker inside
the same selection rectangle used to select the Castle.

## Symptom

The construction panel did not appear after the test dragged a box over the
revealed opponent base. The selected context remained Worker #1.

## Root cause

The test moved the revealing worker to a tile inside the later selection box.
The box-selection interaction therefore selected the worker instead of the
construction.

## What we missed

The original visibility adaptation asserted that the Castle became observable,
but did not account for the revealing unit participating in the subsequent
selection interaction.

## Fix

The selection-box fixture now reveals the Castle from a nearby tile outside the
selection rectangle and starts the rectangle at the Castle's visible bounds.

## Regression

`tests/e2e/match/selection-box.spec.ts` verifies that the revealed enemy Castle
is selected and that its train, upgrade, and rally commands remain locked in
Chromium and Firefox.

## Prevention

Visibility setup for selection tests must leave the revealing unit outside the
asserted selection region before the real pointer interaction begins.

## Verification

- `CI=1 E2E_WEB_PORT=5175 E2E_SERVER_PORT=8082 E2E_WORKERS=1 pnpm run test:e2e:focused tests/e2e/match/selection-box.spec.ts --grep "selecting an enemy construction shows its commands as locked" --project=chromium --project=firefox`
