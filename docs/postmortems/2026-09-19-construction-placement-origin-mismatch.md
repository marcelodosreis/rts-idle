---
status: open
classe: presentation
barreira: null
regressao:
  - tests/unit/world-object-layer.test.ts
  - tests/simulation/building-construction.test.ts
  - tests/e2e/building-hud.spec.ts
---

# Construction Placement Origin Mismatch

## Summary

Status: Resolved

A completed Base could appear to move onto its pawn after construction at a
remote location. The simulation and protocol retained the correct building
position, but the renderer used inconsistent local origins for construction
phases.

## Symptom

A completed construction appeared over the pawn rather than over the green
placement marker and foundation at the clicked location.

## Root cause

Preview and foundation geometry used the top-left footprint anchor `(0, 0)`,
while `WorldObjectLayer.drawBase()` centered the completed Base with negative
rectangle offsets and a centered roof.

## What we missed

Renderer tests covered style and persistence data but not geometry at a
non-zero coordinate. Simulation fixtures built at `(0, 0)` with the pawn at
the same position, and the browser test did not complete a construction away
from the pawn.

## Fix

`BUILDING_DEFINITIONS` is now the single source for building footprints in web
placement and renderer geometry. The initial Base, foundation, preview, and
completed Base all use the catalog Base footprint; generic building visuals use
the corresponding catalog footprint. `drawBase()` uses the top-left footprint
anchor for both the body and roof, with a local invariant comment documenting the convention. The BUILD payload,
protocol coordinates, snapshot, simulation position, movement, placement
validation, and public APIs remain unchanged.

## Regression

The renderer unit test compares foundation and completed Base positions and
local bounds at a non-zero origin. The simulation regression builds at `(4, 2)`
from a pawn at `(0, 0)`, checking the building position during travel,
construction, and completion. The browser regression clicks a remote tile and
checks the authoritative construction state through the E2E debug hook.

## Prevention

Every new building visual must test consistency across preview, foundation, and
completed phases using a non-zero footprint origin. Construction browser tests
must complete a build away from the worker and assert authoritative coordinates.

## Verification

Verification: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test:unit`,
`pnpm run test:simulation`, `pnpm run verify`, and `git diff --check` pass.
The first `pnpm run verify:browser` attempt was blocked in Node 20 because the
Playwright launcher requires `node:sqlite`; rerunning with Node 24 completed the
browser gate successfully (33 Chromium tests passed, 17 skipped).
