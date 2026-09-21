# Task Packet: BUILD-001 — Building Placement Validation

## Task

- ID: `BUILD-001`
- Objective: provide a deterministic, renderer-independent rule for validating rectangular building placement.
- Why: establish the geometric contract required before construction can reserve or create a building foundation.
- Scope: `packages/simulation/src/placement/**`, the simulation public export, focused unit/invariant tests, and task status documentation.
- Non-goals: BUILD commands, construction progress, costs, workers, cancellation, production, pathfinding, collision, or UI.

## Read first

`CURRENT_STATE.md`, `docs/ai/EXECUTION_PROTOCOL.md`, `docs/engineering-standard.md`,
`packages/simulation/src/ecs/world.ts`,
`packages/simulation/src/invariants/check-invariants.ts`,
`tests/invariants/check-invariants.test.ts`.

## Contract

`validateBuildingPlacement(mapBounds, occupiedFootprints, candidateFootprint)` is
a pure function. Map coordinates are zero-based, map bounds are half-open, and
footprints occupy the half-open rectangle `[x, x + width) × [y, y + height)`.

- Width and height must be positive integers; otherwise the result is `INVALID_FOOTPRINT`.
- The candidate origin must use integer tile coordinates; otherwise the result is `INVALID_TILE`.
- Every candidate cell must be in the map; otherwise the result is `OUT_OF_BOUNDS`.
- Every candidate cell must be valid according to the map's invalid-tile list; otherwise the result is `INVALID_TILE`.
- Any overlap with an occupied footprint returns `OVERLAP`; edge-touching is allowed.
- Rejection reasons are explicit and checked in stable precedence order.
- Neither the map, occupation list, nor candidate is mutated. Input order does not change the result.

`checkBuildingFootprints` validates an existing footprint list and throws the
simulation `InvariantError` for malformed, out-of-bounds, invalid-cell, or
overlapping footprints. It is exposed for future state-backed integration;
the current `GameState` has no building-footprint component, so no canonical
state or frozen pipeline changes are made in BUILD-001.

## Tests and validation

Focused tests cover valid corners and 4×4 placement, all borders, malformed
dimensions, fractional coordinates, invalid cells, partial/full overlap,
edge-touching, order independence, input immutability, and invariant rejection.

```bash
pnpm vitest run tests/unit/placement.test.ts tests/invariants/check-invariants.test.ts
pnpm run typecheck
pnpm run lint
pnpm run test:simulation
pnpm run test:architecture
pnpm run verify
```

## Acceptance and stop conditions

- [x] Every placement rule and rejection reason has a permanent test.
- [x] Determinism and non-mutation are verified.
- [x] Required validation passes.
- [x] No protocol, renderer, UI, production, or canonical-state changes are introduced.
- [x] Task index and project status are updated only after validation passes.

## Completion report

Report `PASS` or `BLOCKED`, implemented behavior, tests, validation status,
changed files, and architectural changes in the final agent report.
