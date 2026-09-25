---
status: open
classe: coverage
barreira: null
regressao:
  - tests/simulation/economy/building-construction.test.ts
---

# Building reassignment did not persist the new builder

## Summary

During the Building unification, reassignment placed a BUILD order on the new
worker but left the unified component paused. The existing lifecycle test
detected that the building never completed after reassignment.

## Symptom

After pausing a foundation and assigning another worker, the building remained
at its previous progress and `UNDER_CONSTRUCTION`.

## Root cause

The refactor renamed the construction store to `Building` but dropped the
`buildings.set(buildingId, { ...current, builderId: workerId, footprint })`
write from `assignBuilder`.

## What we missed

The initial focused check covered direct construction and economy paths before
the reassignment branch was run after the rename. The lifecycle acceptance test
was the missing immediate check for persistence of the reassigned builder.

## Fix

Restored the single authoritative `Building` write in
`packages/simulation/src/commands/build.ts`. No marker component was added.

## Regression

`tests/simulation/economy/building-construction.test.ts` pauses a Base, assigns a
second worker, and asserts completion and full progress.

## Prevention

The BUILD lifecycle test remains in the simulation barrier and now exercises
pause, reassignment, progress, completion, and snapshot behavior on `Building`.

## Verification

`npx vitest run tests/simulation/economy/building-construction.test.ts tests/simulation/economy/economy-v0.test.ts`
passes after the fix.
