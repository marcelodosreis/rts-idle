---
status: open
classe: coverage
barreira: QH.27.01
regressao:
  - tests/unit/server/demo-session.test.ts
  - tests/e2e/economy/production-playable.spec.ts
---

# Demo Production Component Regression

## Summary

The regression demo rendered Castle command buttons without its production queue or rally state. The browser flow failed because demo seeding only attached the `Production` component to monasteries even though building data declared Castle production capability.

## Symptom

Production E2E tests could select the Castle and see `Train`, but `production-queue-count` and rally state were absent. Training and rally interactions could not complete.

## Root cause

`seedBuildings` used a hardcoded `buildingType === 'MONASTERY'` condition instead of the authoritative building capability definition. Castles were therefore omitted from the production component despite `canProduce: true`.

## What we missed

The server demo seed had no unit test asserting that every production-capable building projects a production queue. The focused E2E run was the first check covering Castle production panel rendering after the data-driven capability migration.

## Fix

`apps/server/src/content/demo/demo-session.ts` now attaches `Production` when the building definition has `canProduce` or `canResearch`, removing the hardcoded Monastery-only branch.

## Regression

`tests/unit/server/demo-session.test.ts` asserts that a regression-scenario Castle projects an empty production queue. The existing production browser flow covers the visible queue and rally behavior.

## Prevention

Keep producer initialization driven by `BuildingDefinition.capabilities` and require the server seed regression test alongside the production E2E flow.

## Verification

Pending focused browser rerun and full verification after the fix.
