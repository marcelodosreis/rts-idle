---
status: open
classe: input-geometry
barreira: QH.27.01
regressao:
  - tests/e2e/match/projectiles-playable.spec.ts
---

# Projectile E2E Camera Frame

## Summary

The first P3.10.01 browser test computed two box-selection endpoints while recentering the camera independently for each unit, so the resulting drag did not enclose both units.

## Symptom

Chromium selected only the Warrior during the dead-target expiry flow and timed out waiting for the Archer and Warrior selection.

## Root cause

The helper returned screen coordinates tied to the camera transform at read time. Moving the camera before reading the second point invalidated the first point.

## What we missed

The test helper did not treat world-to-screen coordinates as belonging to one stable camera frame.

## Fix

`tests/e2e/match/projectiles-playable.spec.ts` now centers once, waits for that camera to settle, resolves every box endpoint together, and then performs the natural drag.

## Regression

The focused Chromium and Firefox case asserts that the natural box interaction selects both intended player units before issuing the expiry attack.

## Prevention

Multi-point browser gestures must resolve all screen coordinates after one explicit stable-camera wait.

## Verification

- `pnpm run test:e2e:focused tests/e2e/match/projectiles-playable.spec.ts --project=chromium --workers=1`
- `pnpm run test:e2e:focused tests/e2e/match/projectiles-playable.spec.ts --project=firefox --workers=1`
