---
status: open
classe: presentation
barreira: null
regressao:
  - tests/unit/placement.test.ts
  - tests/simulation/building-construction.test.ts
  - tests/contracts/build-command.test.ts
---

# Construction Uses the Nearest Footprint Edge

## Summary

Construction workers were always sent to the building origin, making them
approach every building from its upper-left corner regardless of their current
position.

## Symptom

A pawn walked to the top-left origin of a building instead of stopping at the
nearest usable edge, and construction could not progress until it reached that
origin.

## Root cause

`assignBuilder()` used the building position as both the movement destination
and the construction completion condition. BUILD orders did not retain a
worker-specific construction point.

## What we missed

Construction tests asserted the building origin and eventual completion, but
did not assert the worker destination or the side selected from the worker's
position. Edge-of-map and reassignment behavior were also absent from the
acceptance coverage.

## Fix

Added a deterministic side-aware work-point calculation with a fixed
top/right/bottom/left tie-break order and map-edge fallback. BUILD orders now
persist the fixed-point destination, assignment recalculates it for the current
worker, and economy progression checks that persisted point. The canonical
simulation version is now 0.8.0.

## Regression

Unit tests cover all four sides, deterministic ties, and map borders.
Simulation tests cover delayed progression, reassignment recalculation, and
snapshot determinism. The BUILD contract and canonical golden vector were
updated for the new serialized order field.

## Prevention

Future construction changes must assert the persisted work point separately
from the building footprint origin and cover reassignment and map boundaries.

## Verification

Under Node `v24.21.0`, focused simulation/contract tests passed and `verify`
passed. The original claim that the focused building E2E passed 4/4 was
inaccurate: CI run `35537655750` failed `tests/e2e/building-hud.spec.ts:102`
because its work-point assertion was stale. See
`2026-09-20-construction-e2e-stale-work-point-assertion.md` for the correction.
The generated simulation `dist` contains the same work-point flow as `src`.
