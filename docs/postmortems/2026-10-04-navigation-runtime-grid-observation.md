---
status: open
classe: serialization
barreira: null
regressao:
  - tests/simulation/economy/economy-v0.test.ts
---

# Navigation Runtime Grid Leaked Into State Equality

## Summary

Adding the derived navigation grid to `GameState` made otherwise identical
snapshot-restored states fail deep equality because each restore constructed
new closure instances for the same immutable grid data.

## Symptom

The existing economy snapshot continuation test reported that the original and
restored states differed, while the assertion output showed no visible field
difference and their canonical hashes matched.

## Root cause

`NavigationGrid` contains runtime closures over a private typed array. The first
clone implementation enumerated that derived runtime object in `inspectState`,
so equality compared function identity instead of canonical navigation data.

## What we missed

The new state field was validated only through hash equality and navigation
request assertions. The existing full-state snapshot equality test was not run
before the first simulation gate.

## Fix

`packages/simulation/src/navigation/navigation-state.ts` keeps the runtime grid
available to systems but defines it as non-enumerable. The canonical grid
definition remains enumerable and is explicitly serialized.

## Regression

`tests/simulation/economy/economy-v0.test.ts` restores a snapshot and compares
the complete inspected state after continued simulation. It fails if derived
runtime closures leak into observable equality again.

## Prevention

Derived runtime structures must be excluded from canonical and observation
surfaces. New `GameState` fields require both hash continuation and complete
`inspectState()` snapshot equality coverage.

## Verification

The focused economy snapshot test and `tests/simulation/path-budget.test.ts`
both pass after the non-enumerable runtime-grid fix.
