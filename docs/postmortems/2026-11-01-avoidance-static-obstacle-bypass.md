---
status: open
classe: formation
barreira: null
regressao: tests/simulation/army-chokepoint.test.ts
---

# Avoidance candidates bypassed static obstacles

## Summary

Local avoidance candidate steps were validated against buildings and other units
but not against static navigation obstacles (water and other blocked tiles).
During the P3.12.01 army stress fixture an enemy unit entered a blocked water
tile while avoiding traffic.

## Symptom

A unit's authoritative position was inside the competitive map's central water
channel during the army stress run (`unit 11 entered water at 17,17`).

## Root cause

`stepCandidate` in `packages/simulation/src/systems/movement-system.ts`
validated the candidate segment with `segmentIsClear` (buildings and units) but
did not call `segmentHitsStaticObstacle`. The direct route planning checked
static obstacles, so planned paths avoided water, but avoidance offsets could
still step into blocked tiles.

## What we missed

Collision coverage tested buildings and unit overlap, not water/blocked-tile
entry during avoidance. The regression E2E also exercised buildings only.

## Fix

`stepCandidate` now rejects any candidate whose segment hits a static obstacle
before checking buildings and units.

## Regression

`tests/simulation/army-chokepoint.test.ts` asserts every live unit tile stays
outside the authored water/blocked tiles on every tick across the whole stress
run. It failed before the fix and passes after it.

## Prevention

The army stress fixture permanently exercises static-obstacle avoidance in
addition to building and unit collision.

## Verification

- `pnpm exec vitest run tests/simulation/army-chokepoint.test.ts`
- `pnpm run verify`
