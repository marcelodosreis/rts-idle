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
- Authoritative commands include MOVE, STOP, HOLD, PATROL, ATTACK, ATTACK_MOVE, GATHER, DEPOSIT, REPAIR, BUILD, CANCEL_CONSTRUCTION, TRAIN, CANCEL_PRODUCTION, RALLY, and SURRENDER
- 8 pipeline systems: orders → movement → economy → combat → death → supply → victory → invariants
- 3 unit types: pawn (100hp/10dmg), warrior (150hp/15dmg), archer (60hp/8dmg/range 3)
- Combat with simultaneous death, victory/draw/tick-limit
- Economy v0: Worker → Resource (tree → Wood, gold mine → Gold) → cargo → owned Castle → wallet deposit
- Map-authored resources unified under one domain: compact catalog/state, deterministic gather/deposit into Gold/Wood wallets, snapshot deltas, chunked renderer presentation, minimal geometric resource/stump markers, and Gold/Wood HUD
- Snapshot/hash/export/restore
- PixiJS renderer (animated sprites, terrain autotile, combat effects, HP bars)
- Centralized renderer input adapter with Mouse/Trackpad camera profiles, shared
  camera setup, target precedence, pointer capture, and focus-loss cleanup
- Unit selection (click + box), command bar, match overlay
- Playable regression scenario with four controllable workers and no enemies,
   250 starting gold, contextual GATHER, pickaxe/carry animations, progress
   feedback, live Gold/Wood HUD, and a player Base starting at 250/500 HP
- Manual DEPOSIT: a worker that keeps cargo after a manual move shows the carry
  pose and deposits when the player right-clicks an owned completed Base
- Unified Building construction with HUD placement feedback, shared selection,
  pause/resume, worker reassignment, and completion status
- Authoritative supply accounting: Base capacity, unit usage, completed Supply
  Depot capacity, over-cap handling, canonical snapshots, and Supply HUD
- Producer production: Base trains Pawn; Barracks trains Warrior/Archer with
  TRAIN queues, resource/supply reservations, deterministic production state,
  blocked-exit waiting, production snapshots, player-facing HUD flow, and
  per-item cancellation with authoritative refunds and reservation cleanup
- Persistent troop health bars, plus authoritative health for completed Base,
  Barracks, and Supply Depot buildings using the shared damage/death path
- Authoritative pawn repair for explicitly mechanical units and completed
  buildings, with centralized cadence/cost/healing rules and browser coverage
- WebSocket server (isolated per-connection sessions)
- React SPA with BrowserRouter, lazy match/Laboratory routes, and not-found handling
- Feature-first web layout with independent Laboratory browser, editor, stress,
  report, determinism, and performance features
- Match HUD Laboratory menu and enforced web import boundaries
- Automated suites and architecture barriers green
- Strong-typing baseline: single-source domain registries, boundary parsers,
  `assertNever` exhaustive dispatch, canonical tag codecs, hardened tsconfig
  (`verbatimModuleSyntax`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`),
  and an AST typed-domain guard (`tests/architecture/typed-domain.test.ts`)

## Current Gameplay

Player connects → gets isolated match → selects units → issues commands → fights
pre-scripted enemies, or opens the default scenario to gather and deposit
resources through the authoritative command path. In the economy scenario, the player
can also place Base/Barracks/Supply Depot construction, pause it by stopping the
worker, and resume it by assigning another worker through the construction HUD.
The top bar shows authoritative `used / cap` supply and updates on Depot completion.
Completed Base/Barracks producers accept rally points; trained units wait at a
blocked exit without overlap and follow the latest authoritative rally point
after spawning.

No real AI, pathfinding, fog of war, or multiplayer.
Resource tiles remain permanently reserved for construction; physical
movement blocking is deferred with pathfinding/collision.

## Current Limitations

- No AI (enemies are pre-scripted)
- No pathfinding (straight-line movement)
- No collision/avoidance
- No fog of war
- No minimap
- No multiplayer rooms
- No audio

## Active Task

The repository physical reorganization is complete. Server transport, match
bootstrap, session projections, quality tooling, fixtures, unit tests,
simulation tests, and Laboratory E2E tests are grouped by domain. The physical
layout architecture barrier is enforced by
`tests/architecture/physical-layout.test.ts`. E2E runs support isolated ports
through `E2E_WEB_PORT` and `E2E_SERVER_PORT`; the scenario-query reset regression
is documented in `docs/postmortems/2026-09-25-e2e-scenario-query-reset.md`.

The QUAL-019..024 quality baseline is complete repository-wide: clean code,
SOLID, and typed domain strings are documented in
`docs/engineering-standard.md` and enforced by Biome, the AST typed-domain
guard, `lint-staged`, the pre-push hook, CI, review, and the pull-request
template. The whole app (packages, apps, tools, tests) now meets the file ≤400 /
function ≤50 bar with no suppressed violations; one refactor regression was
caught by E2E and documented in
`docs/postmortems/2026-09-24-devtools-menu-content-ids.md`.

P2.07 Production Queue and Unit Training is complete for the target roster:
Base trains Pawn and Barracks trains Warrior/Archer. P2.08 Blocked Spawn and
Rally is complete: producer rally points are authoritative, blocked exits retain
completed items and reservations, and the browser flow covers setting rally,
training, waiting, and recovery.

P2.09.01 Production Cancellation and Producer Cleanup is complete: any queue
item can be canceled through the authoritative command path, refunds follow
queued/active/completed-waiting state, and producer removal releases all
reservations without refund. The match HUD shows each queue row, refund
feedback, and two-step cancellation confirmation.

P2.10.01 Persistent Unit Health Bars and P2.10.02 Building Health and Shared
Damage are complete. Full-health troops keep their overhead HP bars; completed
buildings use the shared Health component and can be damaged and destroyed.
P2.10 Repair is complete. Pawns select the deterministic first worker from the
selection, repair mechanical owned targets every 10 ticks for centralized
5-HP/1-gold rules, and expose authoritative progress/HP through the HUD and
regression E2E scenario.

RESOURCE.01 Natural Resources Visual Completion is complete: authoritative
trees are not ECS entities, active trees and depleted stumps render as minimal
geometric markers without loading tree art assets, resource tiles are validated as land/elevated and reserved
for construction, and the real-server regression flow covers Wood gathering,
depletion, stump persistence, and construction rejection. Unit, integration,
simulation, architecture, verification, benchmark, performance, and full
Chromium/Firefox E2E gates are green.

RESOURCE.02 Unified Resource Domain is complete: one canonical `Resource` model
replaced the removed mineral-node and natural-resource paths across shared,
game-data, protocol, simulation, server, renderer, web, and tools. `GATHER`
uses `resourceId` with `TO_RESOURCE`/`HARVESTING` phases, players hold canonical
Gold/Wood wallets, `ResourceCost` unifies construction/training/research
pricing, and `tests/architecture/legacy-resource-symbols.test.ts` blocks
reintroduction of the removed symbols.

Quality Hardening remains deferred after the completed QUAL-016 output hygiene
and QUAL-018 tracking work. The Concept Authority closure (AUTH-005A through
AUTH-018) is complete; its audit records the authority and validation evidence.
See `docs/tasks/todo.md` for the remaining quality board.

WEB-ARCH-001 Web Frontend Architecture Restructure is complete. The old MPA
entries `/sprites/`, `/det.html`, and `/perf.html` were removed; Laboratory
routes now live under `/laboratory`.

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

# Completion gate (at feature completion)
pnpm run verify

# Browser iteration (functional coverage without heavy benchmarks)
pnpm run test:e2e:fast

# Performance iteration
pnpm run test:e2e:perf

# Complete browser/release gate: all tests, both browsers, including performance
pnpm run test:e2e:all
```

The CI runs `test:e2e:fast` and `test:e2e:perf` as independent jobs. Their union
is equivalent to `test:e2e:all`, while keeping functional feedback independent
from the heavy renderer benchmark.

## Definition of Done

- Behavior correct and verified at runtime
- New behavior covered by tests
- No regressions
- Typecheck, lint, build pass
- No public API removed/renamed
- No forbidden imports introduced
- Docs updated if decision changed
