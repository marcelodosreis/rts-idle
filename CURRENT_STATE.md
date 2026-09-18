# Current State

> Minimum operational context for AI agents. Updated at milestone boundaries.

## Product Goal

Browser-first competitive RTS with deterministic simulation, server authority, and strong automated testing.

## Current Milestone

**Phase 1 complete.** Phase 2 (Economy and Production) is next.

See `tasks/todo.md` for full phase list.

## Working Systems

- ECS engine (7 components, custom, Map-based stores)
- Fixed timestep (20 ticks/s, single-writer `step()`)
- Deterministic simulation (xoshiro128**, fixed-point, SHA-256 hashes)
- 7 commands: MOVE, STOP, HOLD, PATROL, ATTACK, ATTACK_MOVE, SURRENDER
- 6 pipeline systems: orders → movement → combat → death → victory → invariants
- 3 unit types: pawn (100hp/10dmg), warrior (150hp/15dmg), archer (60hp/8dmg/range 3)
- Combat with simultaneous death, victory/draw/tick-limit
- Snapshot/hash/export/restore
- PixiJS renderer (animated sprites, terrain autotile, combat effects, HP bars)
- Unit selection (click + box), command bar, match overlay
- WebSocket server (isolated per-connection sessions)
- 280 passing tests, architecture barriers green

## Current Gameplay

Player connects → gets isolated match → selects units → issues commands → fights AI-controlled enemies (pre-scripted attacks) → wins by elimination or draws at 5000 ticks.

No economy, no building, no production, no real AI, no pathfinding, no fog of war, no multiplayer.

## Current Limitations

- No economy (PlayerState.gold always 0)
- No buildings (assets exist, no system)
- No production queue
- No AI (enemies are pre-scripted)
- No pathfinding (straight-line movement)
- No collision/avoidance
- No fog of war
- No minimap
- No multiplayer rooms
- No audio

## Active Task

None. Phase 1 complete, awaiting Phase 2 kickoff.

## Engineering Invariants

- Simulation imports nothing from UI/transport/platform (enforced by tests)
- Only `step()` mutates GameState (single-writer)
- Same seed + commands = same result (determinism verified by golden hashes)
- Commands validated atomically before mutation
- Architecture tests enforce package dependency matrix
- Typecheck, lint, and all test suites must pass before merge

## Do Not Touch

- `packages/simulation/src/canonical/` — serialization format is pinned
- `packages/simulation/src/systems/pipeline.ts` — system order is frozen
- `packages/shared/src/rng/` — RNG implementation is pinned
- `tests/fixtures/seeds.ts` — test seeds are shared and pinned
- `tests/simulation/hash-golden.test.ts` — golden hash is pinned

## Validation

```bash
# Per-task (run after each change)
pnpm run typecheck
pnpm run lint
pnpm run test:unit
pnpm run test:simulation

# Per-feature
pnpm run test:integration
pnpm run test:contracts
pnpm run test:orders

# Milestone gate
pnpm run verify
```

## Definition of Done

- Behavior correct and verified at runtime
- New behavior covered by tests
- No regressions
- Typecheck, lint, build pass
- No public API removed/renamed
- No forbidden imports introduced
- Docs updated if decision changed
