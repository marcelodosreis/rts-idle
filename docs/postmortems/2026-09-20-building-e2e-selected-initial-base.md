---
status: open
classe: coverage
barreira: null
regressao:
  - tests/e2e/economy/building-hud.spec.ts
---

# Building E2E selected the initial Base instead of the placed building

## Summary

The building HUD E2E tests selected the first item from the buildings debug
collection, which became the completed scenario Base after building unification.

## Symptom

Construction lifecycle assertions expected the new building at the clicked
location but instead received the initial completed Base at a different position.

## Root cause

The tests assumed that the newly placed building would be the first enumerable
item in the debug collection. The unified snapshot correctly includes all
buildings, so that ordering assumption was invalid.

## What we missed

The E2E assertions used collection position rather than the observable identity
of the building created by the test.

## Fix

Added a helper that finds the selected construction by the fixed-point location
used to place it, and updated each lifecycle assertion to use that helper.

## Regression

`tests/e2e/economy/building-hud.spec.ts` now verifies foundation, active construction,
and completion state for the building at the exact clicked location.

## Prevention

Browser tests must identify world objects by stable IDs or observable location,
never by enumeration order in a snapshot-derived collection.

## Verification

Run the focused building HUD Playwright spec and the full Chromium E2E gate.
