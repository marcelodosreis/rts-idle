# Task Packet: BUILD-002 — Base Construction

## Objective

Implement the deterministic authoritative BUILD flow for the `BASE` building:
foundation creation and footprint reservation, worker construction, pause,
takeover by another worker, completion, and functional Base activation.

## Contract

- `BUILD` accepts one owned `pawn`, an integer tile origin, and `BASE`.
- Placement, ownership, worker kind, phase, and mineral balance are validated
  before any state mutation.
- A foundation reserves its persisted rectangular footprint immediately.
- The baseline Base definition is a 2×2 footprint, costs 100 minerals, and
  requires 100 construction ticks.
- Only one worker advances a construction at a time. A worker must arrive at
  the foundation; leaving or stopping pauses progress, and another worker can
  take over without paying again.
- `Base` is added only at `COMPLETED`; incomplete construction cannot be used
  as an economy deposit point.
- Construction state, orders, map bounds, progress, builder references, and
  footprints are canonical and deterministic across snapshots, restore, and
  replay.

## Non-goals

Cancellation, refunds, supply, production, other building types, pathfinding,
collision, repair, research, and UI/build-menu work.

## Validation

- BUILD unit, contract, simulation, invariant, snapshot, and replay coverage.
- Node 24.21.0 TypeScript builds and Biome checks.
- 55 non-browser test files / 390 tests pass.

## Completion

- [x] BUILD command and protocol guard
- [x] Base definition and canonical construction state
- [x] Foundation reservation, worker progress, pause, takeover, completion
- [x] Snapshot/hash/replay/invariant coverage
- [x] Validation gates passed
