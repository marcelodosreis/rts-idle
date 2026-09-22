# Current State

> Minimum operational context for AI agents. Updated at milestone boundaries.

## Product Goal

Browser-first competitive RTS with deterministic simulation, server authority, and strong automated testing.

## Current Milestone

**Phase 2 in progress.** Economy v0 is implemented and exposed through a dedicated browser scenario.

See `docs/tasks/todo.md` for full phase list.

## Working Systems

- ECS engine (10 components, custom, Map-based stores)
- Fixed timestep (20 ticks/s, single-writer `step()`)
- Deterministic simulation (xoshiro128**, fixed-point, SHA-256 hashes)
- 9 commands: MOVE, STOP, HOLD, PATROL, ATTACK, ATTACK_MOVE, GATHER, DEPOSIT, SURRENDER
- 8 pipeline systems: orders → movement → economy → combat → death → supply → victory → invariants
- 3 unit types: pawn (100hp/10dmg), warrior (150hp/15dmg), archer (60hp/8dmg/range 3)
- Combat with simultaneous death, victory/draw/tick-limit
- Economy v0: Worker → Mineral Node → cargo → owned Base → wallet deposit
- Snapshot/hash/export/restore
- PixiJS renderer (animated sprites, terrain autotile, combat effects, HP bars)
- Centralized renderer input adapter with Mouse/Trackpad camera profiles, shared
  camera setup, target precedence, pointer capture, and focus-loss cleanup
- Unit selection (click + box), command bar, match overlay
- Playable economy scenario with four controllable workers, 250 starting minerals,
  contextual GATHER, pickaxe/carry animations, progress feedback, and live Mineral HUD
- Manual DEPOSIT: a worker that keeps cargo after a manual move shows the carry
  pose and deposits when the player right-clicks an owned completed Base
- Unified Building construction with HUD placement feedback, shared selection,
  pause/resume, worker reassignment, and completion status
- Authoritative supply accounting: Base capacity, unit usage, completed Supply
  Depot capacity, over-cap handling, canonical snapshots, and Supply HUD
- WebSocket server (isolated per-connection sessions)
- Automated suites and architecture barriers green

## Current Gameplay

Player connects → gets isolated match → selects units → issues commands → fights
pre-scripted enemies, or opens `?scenario=economy` to gather and deposit
minerals through the authoritative command path. In the economy scenario, the player
can also place Base/Barracks/Supply Depot construction, pause it by stopping the
worker, and resume it by assigning another worker through the construction HUD.
The top bar shows authoritative `used / cap` supply and updates on Depot completion.

No production, real AI, pathfinding, fog of war, or multiplayer.

## Current Limitations

- No production queue
- No AI (enemies are pre-scripted)
- No pathfinding (straight-line movement)
- No collision/avoidance
- No fog of war
- No minimap
- No multiplayer rooms
- No audio

## Active Task

VS-01B Playable Economy Integration is complete, including visible mining/carrying feedback.
ECONOMY-006 Manual cargo deposit and visible carrying state is complete.
Building lifecycle coverage is complete for Base and Barracks through the shared
Building component and `buildings` snapshot collection.
BUILD-004 Supply Depot and Supply HUD is complete. Production queues, training,
reserved supply, and VS-02 have not started.

Quality Hardening (QUAL-000..018) is in progress. The Concept Authority closure
(AUTH-005A through AUTH-018) is complete; its audit records the authority and
validation evidence. See `docs/tasks/todo.md` for the remaining quality board.

Architecture evolution is tracked in `docs/rfc/RFC-001-technology-substitutability.md`
(Proposed; no implementation started).

Deployment and environments are tracked in
`docs/rfc/RFC-002-deployment-and-environments.md` (Proposed; target Render free,
Docker same-origin monolith, `staging` + `main`).

Cost, scale, and architecture comparison is tracked in
`docs/rfc/RFC-003-cost-scale-and-architecture-comparison.md` (Proposed; isolated
sessions → delta → rooms → fog of war → 200k players).

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
# Iteration (after intermediate edits)
pnpm run typecheck
pnpm run lint
pnpm run test:unit
pnpm run test:simulation

# Per-feature
pnpm run test:integration
pnpm run test:contracts
pnpm run test:orders

# Completion gate (at feature completion; choose E2E by changed risk)
pnpm run verify
pnpm run test:e2e:all  # Chromium + Firefox; browser/protocol changes, release, or CI
```

## Definition of Done

- Behavior correct and verified at runtime
- New behavior covered by tests
- No regressions
- Typecheck, lint, build pass
- No public API removed/renamed
- No forbidden imports introduced
- Docs updated if decision changed
