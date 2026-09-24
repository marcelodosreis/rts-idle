# Task Packet: BUILD-003 — Barracks Construction

## Objective

Extend the deterministic authoritative BUILD flow with the `BARRACKS` building
type, without starting unit production.

## Contract

- `BUILD` accepts one owned `pawn`, an integer tile origin, and either `BASE` or
  `BARRACKS`.
- Placement, ownership, worker kind, phase, and mineral balance are validated
  before any state mutation.
- `BARRACKS` has a 3×3 footprint, costs 150 minerals, and requires 100
  construction ticks.
- Foundations reserve their persisted footprint immediately. Construction can
  pause, transfer to another worker, and resume without charging again.
- Completion activates only the marker matching the construction type:
  `BASE` activates `Base`; `BARRACKS` activates `Barracks`.
- Construction, BUILD orders, snapshots, hashes, and replay remain canonical
  and deterministic.

## Non-goals

Unit production, queues, supply, rally points, UI/build menus, cancellation,
refunds, pathfinding, collision, repair, and additional building types.

## Validation

- Unit, contract, simulation, invariant, snapshot, replay, and canonical golden
  coverage.
- TypeScript, Biome, package architecture barriers, and repository verification.

## Completion

- [x] BARRACKS definition, protocol guard, and canonical tags
- [x] Generalized BUILD foundation creation and resource validation
- [x] Barracks marker activation with existing pause/takeover behavior
- [x] Determinism and regression coverage
- [x] Validation gates passed (repository pnpm wrapper could not verify its
  pinned pnpm signature in this environment; the shared construction flow was
  later re-validated under Node 24 by BUILD-004)
