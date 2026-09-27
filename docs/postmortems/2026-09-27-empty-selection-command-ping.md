---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/match/selection-feedback.spec.ts
---

# Empty Selection Showed Command Ping

## Summary

Right-clicking the game world without a selected unit displayed the red command
ping instead of the neutral white pointer.

## Symptom

The pointer feedback was not white after clicking the ground with an empty selection.

## Root cause

The renderer used the red selection color as the default for every ground
secondary activation.

## What we missed

The E2E coverage only asserted the positive case, where a selected unit creates
a ping. It did not cover an empty-selection secondary click.

## Fix

`PixiRenderer` now uses the white neutral pointer for an empty selection and the
red selection color for selected units, while preserving rally-mode behavior.

## Regression

`selection-feedback.spec.ts` now asserts that a right-click with no selection
creates a neutral pointer.

## Prevention

The empty-selection negative case is part of the browser interaction suite.

## Verification

Focused Chromium E2E validation is run with:

`pnpm run test:e2e:focused tests/e2e/match/selection-feedback.spec.ts --project=chromium`
