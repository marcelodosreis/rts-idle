---
status: open
classe: convention
barreira: QH.24
regressao:
  - tests/architecture/web-file-conventions.test.ts
---

# Web rebase restored a second component export

## Summary

Resolving the web architecture rebase restored `UnitChip` as a public export in
`unit-selection-card.tsx`, leaving two exported React components in one file.
The architecture gate blocked the branch before it was pushed.

## Symptom

`pnpm run test:architecture` reported
`features/match/components/unit-selection-card.tsx` as violating the one
component export convention.

## Root cause

The resource-branch version of the component was transplanted to the
refactored destination to preserve resource behavior, but its unnecessary
`UnitChip` export was retained.

## What we missed

The conflict-resolution review focused on imports and resource semantics and
did not compare the target file's public export surface against the architecture
contract before running the gate.

## Fix

`UnitChip` is now file-private in
`apps/web/src/features/match/components/unit-selection-card.tsx`; no external
consumer uses it.

## Regression

`tests/architecture/web-file-conventions.test.ts` now directly asserts that
the unit-selection card exports exactly one React component. It fails when
`UnitChip` is exported.

## Prevention

Every conflict-resolved `.tsx` destination is checked by the existing web
convention barrier, with this direct regression covering the restored-export
case.

## Verification

- `pnpm run test:architecture`
- `pnpm run verify`
- `pnpm run test:e2e:all`
