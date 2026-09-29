---
status: open
classe: convention
barreira: null
regressao:
  - tests/simulation/economy/production-queue.test.ts
---

# Produced Pawn Cannot Gather

## Summary

A Pawn produced by a completed Base spawned successfully but a later `GATHER` command was rejected because the unit was not recognized as an available worker.

## Symptom

The browser reported `ENTITY_UNAVAILABLE: GATHER: entity 8 is not an available worker` when the player ordered the newly produced Pawn to mine.

## Root cause

The production spawn path initialized the new unit's position, owner, kind, health, combat, and orders, but omitted the `Cargo` component required by the worker validation in `applyGather`.

## What we missed

Production tests verified that a spawned Pawn had the correct kind and health but did not assert that it had the complete worker component set or execute a post-spawn gather command.

## Fix

`production-system.ts` now initializes Pawns with zero cargo and `MINERAL_CARGO_CAPACITY`; combat units do not receive worker cargo.

## Regression

`tests/simulation/economy/production-queue.test.ts` now asserts that the Pawn spawned by production has the required `Cargo` component.

## Prevention

The production spawn test covers the worker component required by the authoritative GATHER boundary. Future produced-worker behavior must preserve the worker component contract.

## Verification

The focused production simulation test, typecheck, lint, and full verification gate passed after the fix.
