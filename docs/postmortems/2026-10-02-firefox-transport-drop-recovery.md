---
status: open
classe: completion-gate
barreira: QH.26.01
regressao:
  - tests/e2e/match/transport-recovery.spec.ts
---

# Firefox Transport Drop Recovery

## Summary

The final repeated Firefox transport run intermittently skipped a delta without issuing the expected resync request. The failure was observed on repeat 3 on 2026-10-02 and could leave recovery dependent on the timing of a later delta or periodic full snapshot.

## Symptom

After the E2E transport hook dropped one delta, `droppedDeltas` increased but `resyncRequests` remained zero until the assertion timed out.

## Root cause

The test-only drop hook consumed the next delta and returned the previous baseline without entering `resync_pending`. The implementation relied on a subsequent delta with a mismatched base to detect the gap; browser timing could instead deliver a full snapshot first or delay the next delta.

## What we missed

The Chromium repetition was green, but the final Firefox repetition had not been run after the previous closure. The existing E2E assertion covered the expected request but the diagnostic drop path itself did not transition the transport state immediately.

## Fix

`apps/web/src/shared/transport/connection.ts` now enters `resync_pending` and sends one resync request immediately when the enabled test-only drop hook consumes a delta. The existing state guard prevents duplicate requests if another dropped delta arrives while recovery is pending.

## Regression

`tests/e2e/match/transport-recovery.spec.ts` asserts that a forced dropped delta increments `resyncRequests`, produces a full snapshot, and accepts the following delta. The Chromium and Firefox repeat runs exercise this path 20 times each.

## Prevention

Keep the transport drop-hook scenario in the required repeated browser gate and treat the diagnostic drop as an explicit recovery transition rather than relying on later network timing.

## Verification

The original Firefox run failed on repeat 3 with `resyncRequests` equal to zero. Focused unit/E2E, full verification, fuzz, and both repeated browser gates will be rerun after the fix.
