---
status: open
classe: serialization
barreira: null
regressao:
  - tests/unit/simulation/formation-offsets.test.ts
---

# Formation Offset Negative Zero

## Summary

Refactoring the existing formation offset helper to reuse tile-space spiral
offsets changed a zero component into JavaScript `-0`, breaking the exact
formation contract even though rendered positions were numerically equivalent.

## Symptom

The formation unit test expected `{ dy: 0 }` but received `{ dy: -0 }` for the
first ring's horizontal candidate.

## Root cause

The previous helper normalized zero components with `value || 0`. The refactor
removed that normalization while multiplying the shared raw spiral offset.

## What we missed

The new group-destination tests passed, but the existing exact-value formation
test was not treated as a regression check during the first edit.

## Fix

`packages/simulation/src/domain/formation.ts` retains explicit zero
normalization when converting tile offsets to fixed-point formation offsets.

## Regression

`tests/unit/simulation/formation-offsets.test.ts` asserts the exact first-ring
offset and therefore fails if negative zero leaks into the public formation API.

## Prevention

Shared raw geometry helpers must preserve the established numeric normalization
at conversion boundaries. Run the existing formation suite alongside new group
destination tests.

## Verification

The focused formation unit/integration run passes after the normalization fix.
