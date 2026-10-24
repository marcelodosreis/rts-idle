---
status: open
classe: serialization
barreira: QH.19
regressao:
  - tests/simulation/combat/basic-combat.test.ts
---

# Projectile Snapshot Codec

## Summary

During P3.10.01 implementation, restoring a snapshot containing an active projectile failed before the feature was shipped. The projectile-store decoder consumed its length field repeatedly while iterating, causing a buffer overrun after the first projectile.

## Symptom

`simulationFromSnapshot(sim.exportSnapshot())` threw `readProjectileStore: projectile IDs must be unique and ordered` for a valid snapshot with one active Archer projectile.

## Root cause

`readProjectileStore` called `reader.readLength()` in the `for` loop condition. The first iteration read the projectile correctly, but the next loop condition attempted to read another length from the end of the projectile payload.

## What we missed

The initial codec was not tested with a non-empty active store before integration. The existing empty-store golden snapshot could not exercise the decoder loop body.

## Fix

Read the projectile count once before iterating in `packages/simulation/src/projectiles/projectile-codec.ts`.

## Regression

`tests/simulation/combat/basic-combat.test.ts` now launches an Archer projectile, restores the canonical snapshot, and asserts equal state hashes and active projectile state.

## Prevention

Non-empty projectile serialization is now part of the simulation combat suite and the P3.10.01 acceptance criteria require snapshot/restore and replay equivalence.

## Verification

- `pnpm exec vitest run tests/simulation/combat/basic-combat.test.ts -t 'restores active projectile'`
- Result: 1 passed.
