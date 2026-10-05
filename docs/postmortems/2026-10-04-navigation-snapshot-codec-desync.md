---
status: open
classe: serialization
barreira: null
regressao:
  - tests/simulation/path-budget.test.ts
---

# Navigation Snapshot Codec Desynchronization

## Summary

The first serializable navigation snapshot could not be restored because the
codec consumed a new length field on every iteration of several decode loops.
The reader then entered the player section at the wrong byte offset and rejected
the snapshot as invalid.

## Symptom

`tests/simulation/path-budget.test.ts` failed while restoring a pending search
with `readPlayers: invalid supply`, even though the original simulation state
had valid zeroed supply values.

## Root cause

Navigation decode loops used `reader.readLength()` directly in their loop
conditions. Each condition evaluation advanced the canonical reader, so the
first collection length was followed by arbitrary payload bytes rather than a
stable count.

## What we missed

The codec was typechecked before exercising a real pending snapshot. The packet
acceptance criterion required snapshot/restore continuation, but the first
focused test did not run until after the entire codec was written.

## Fix

`packages/simulation/src/navigation/navigation-codec.ts` now reads each
collection length once before iterating over open entries, scores, parents,
closed tiles, paths, blocked tiles, and requests.

## Regression

`tests/simulation/path-budget.test.ts` snapshots four in-flight searches,
restores the snapshot, advances both simulations, and asserts equal hashes,
results, and availability ticks. The test fails at restore without this fix.

## Prevention

Canonical codecs must assign every length to a local constant before a decode
loop. Snapshot tests must include non-empty pending collections and continue the
restored state through the next availability transition.

## Verification

The focused path-budget suite is the required verification command after the
codec fix; repository simulation and full verification gates remain pending.
