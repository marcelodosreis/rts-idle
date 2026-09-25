---
status: open
classe: convention
barreira: null
regressao:
  - tests/simulation/economy/economy-v0-edge-cases.test.ts
---

# Simulation Test Fixture Relative Import

## Summary

Moving the economy edge-case simulation test into its domain directory left one fixture import at its former relative path, preventing the suite from loading.

## Symptom

`pnpm run test:simulation` failed before running the economy edge-case tests because Vitest could not resolve `../fixtures/simulation/economy.js`.

## Root cause

The test moved one directory deeper, but its direct economy fixture import was not updated with the other fixture imports.

## What we missed

The initial move audit searched the three requested fixture filenames but did not search every relative fixture import from moved simulation tests.

## Fix

`tests/simulation/economy/economy-v0-edge-cases.test.ts` now imports the fixture from `../../fixtures/simulation/economy.js`.

## Regression

`tests/simulation/economy/economy-v0-edge-cases.test.ts` remains in the simulation suite; its module load fails if the fixture path regresses.

## Prevention

Test-layout moves now require a complete relative-import search followed by the owning test-suite run.

## Verification

- `pnpm run test:simulation`
- `pnpm run test:architecture`
