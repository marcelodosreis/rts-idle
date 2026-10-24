---
status: open
classe: coverage
barreira: QH.19
regressao:
  - tests/unit/server/snapshot-sender.test.ts
---

# Projectile Full-Snapshot Baseline

## Summary

During P3.10.01 implementation, periodic full snapshots retained stale projectile IDs in `SnapshotSender`, causing a later delta to report a removal relative to an already refreshed baseline.

## Symptom

After a projectile disappeared before a periodic full snapshot, the next delta could contain its ID in `removedProjectileIds` even though that full snapshot contained no projectile.

## Root cause

`fullMessage` cleared known unit and building IDs before rebuilding its baseline, but did not clear `projectileIds`.

## What we missed

Delta tests covered projectile removal but not the full-snapshot-to-next-delta transition after a projectile disappeared between sends.

## Fix

`apps/server/src/transport/snapshot-sender.ts` now clears projectile IDs whenever it establishes a full baseline.

## Regression

`tests/unit/server/snapshot-sender.test.ts` launches and removes a projectile, refreshes the periodic full snapshot, and asserts that the following delta has no stale removal.

## Prevention

Every mutable delta baseline now has a periodic full-refresh regression covering the next delta.

## Verification

- `pnpm exec vitest run tests/unit/server/snapshot-sender.test.ts`
