---
status: open
classe: convention
barreira: QH.19
regressao:
  - tests/e2e/economy/production-playable.spec.ts
---

# Production Queue Used Array Index Keys

## Summary

The production queue rendered React rows with a key containing the array index,
which triggered the repository lint barrier and could misidentify rows when a
queue changed.

## Symptom

`pnpm run lint` reported `noArrayIndexKey` in `ProductionPanel.tsx`.

## Root cause

The wire contract has no queue item ID, and the UI used the positional index as
the row identity.

## What we missed

The queue cancellation feature was reviewed for behavior but not for stable
React list identity under the mandatory lint gate.

## Fix

`ProductionPanel.tsx` now derives deterministic content-plus-occurrence keys
without using the array index as the React key.

## Regression

The existing production browser suite continues to exercise queue rendering,
cancellation, refunds, and blocked rows.

## Prevention

Lint runs on every repository validation and rejects positional React keys.

## Verification

- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test:e2e:focused tests/e2e/economy/production-playable.spec.ts --project=chromium`
