---
status: open
classe: coverage
barreira: QH.19
regressao:
  - tests/simulation/combat/projectiles.test.ts
---

# Projectile Dead-Target Expiry Position

## Summary

During P3.10.01 implementation, a projectile reaching a dead target emitted `projectileExpired` at its position from the previous tick instead of the target's last-known endpoint.

## Symptom

The expiry marker appeared behind the dead target even though the projectile was removed because it had reached the target's last-known position.

## Root cause

The dead-target branch checked whether the current movement step could reach the endpoint, then emitted the event from the pre-move projectile value.

## What we missed

The first dead-target test asserted only the expiry reason and did not assert event coordinates through the normal command and tick path.

## Fix

`packages/simulation/src/projectiles/projectile-system.ts` now computes the reached projectile before removal and emits its endpoint coordinates.

## Regression

`tests/simulation/combat/projectiles.test.ts` kills the target through a same-tick instant attack and asserts exact last-known expiry coordinates.

## Prevention

Lifecycle event regressions now assert reason, position, damage absence, and command-driven execution.

## Verification

- `pnpm exec vitest run tests/simulation/combat/projectiles.test.ts`
