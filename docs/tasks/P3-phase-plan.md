# Phase 3 Plan - Navigation, Complete Combat, and Fog

## Priority Decision

Phase 3 is the active product milestone. Quality Hardening is deferred
backlog: its pending tasks remain tracked, but they do not block Phase 3
gameplay work. Phase 2 economy and production are complete through `P2.12`.

The master plan is the canonical source for Phase 3 scope. The task index and
todo list use the explicit task IDs in this document so that every deliverable
has a packet, dependencies, and a validation gate.

## Objective

Replace straight-line movement and globally visible combat with deterministic
navigation, local collision handling, player-specific vision, filtered
observations, projectiles, area damage, and a reproducible army stress case.

## Constraints

- The simulation remains portable and deterministic.
- Only `step()` and its systems mutate `GameState`.
- Navigation work uses integer costs and no wall-clock budget.
- The frozen system order remains authoritative; navigation runs before
  movement and collision as defined by ADR-013.
- The server remains authoritative; the browser renders observations and sends
  commands only.
- Every gameplay capability needs authoritative behavior, a player-facing
  interaction, visible progress or blocked feedback, and real-server E2E.
- Canonical serialization, snapshot compatibility, RNG behavior, and golden
  hashes require explicit versioning when state semantics change.

## Dependency Sequence

```text
P3.01.01 Navigation grid
  -> P3.01.02 A* pathfinding
  -> P3.02.01 Serializable incremental search
  -> P3.03.01 Footprint invalidation
  -> P3.04.01 Group destinations
  -> P3.06.01 Collision and avoidance
P3.01.01 -> P3.05.01 Spatial index
P3.05.01 -> P3.07.01 Vision and memory
P3.07.01 -> P3.08.01 Filtered observations and events
P3.08.01 -> P3.08.02 Fog rendering
P3.06.01 + P3.07.01 -> P3.09.01 Targeting and pursuit
P3.09.01 -> P3.10.01 Projectiles -> P3.11.01 Area damage
P3.06.01 + P3.08.02 + P3.11.01 -> P3.12.01 Combined stress
```

## Stage Plan

### P3.01.01 - Navigation Grid

Create the pure `pathfinding` grid foundation. It owns dimensions, row-major
tile indexing, walkability, bounds checks, and deterministic eight-neighbor
enumeration. It must not import simulation, protocol, renderer, DOM, or Node
APIs.

Acceptance: invalid inputs fail closed; valid grids preserve their input
without mutation; neighbors and tile indexes are stable across runs; focused
unit tests and the package build pass.

Packet: `docs/tasks/P3.01.01.md`.

### P3.01.02 - A* Pathfinding

Implement the deterministic heap and A* search using orthogonal cost `1024`,
diagonal cost `1448`, octile heuristic, no corner cutting, and tie-break
`f -> h -> tile index`.

Acceptance: small fixtures produce valid optimal paths, unreachable targets
are explicit, invalid starts or destinations do not crash, and repeated runs
produce identical results.

### P3.02.01 - Serializable Incremental Search

Add the bounded navigation request state and incremental search budget. Support
up to four active searches, 4,096 total expansions per tick, 256-expansion
round-robin slices, stable request ordering, and serializable `PENDING`,
`FOUND`, `UNREACHABLE`, and `INVALIDATED` results.

Acceptance: pausing, snapshotting, restoring, and continuing a search gives
the same result and availability tick as uninterrupted execution.

### P3.03.01 - Footprint Navigation Invalidation

Connect authoritative building footprints to navigability. Construction,
cancellation, completion, and destruction update the navigation state without
rebuilding unrelated data. In-flight searches are invalidated deterministically
when their route becomes unavailable.

Acceptance: no path crosses a newly blocked footprint; cancellation or
destruction releases the footprint; pending orders receive `INVALIDATED` or a
deterministic replan result.

### P3.04.01 - Group Destinations

Replace stacked multi-unit destinations with deterministic formation targets.
Sort units by entity ID, generate positions around the click in a stable spiral,
select navigable and distinct targets, and request paths in order.

Acceptance: selected units receive stable distinct destinations, blocked
positions are skipped deterministically, and formation behavior survives
snapshot/restore and replay.

### P3.05.01 - Spatial Index

Add deterministic spatial queries for units and buildings. The index is a
presentation-independent simulation data structure used by collision, vision,
targeting, and combat queries instead of repeated exhaustive scans.

Acceptance: indexed queries match an exhaustive reference implementation,
tie-breaks are stable, updates are correct after movement and lifecycle
changes, and the index does not leak mutable state.

### P3.06.01 - Collision and Avoidance

Resolve movement against building footprints and mobile units. Test the
traversed segment, enforce logical unit radii, use the spatial index, and apply
fixed deterministic avoidance and blockage rules.

Acceptance: units do not cross walls, teleport, overlap to resolve chokepoints,
or recompute A* every frame. Persistent blockage is observable and resolved or
reported deterministically. MOVE, PATROL, ATTACK_MOVE, GATHER, DEPOSIT, BUILD,
and rally movement retain their authoritative behavior.

Player slice: the match screen lets the player issue movement around a wall or
building, shows progress, and reports blocked or unreachable destinations.
Real-server Chromium and Firefox E2E are required.

### P3.07.01 - Vision and Memory

Add player-specific visible, explored, and unknown map state. Visibility is
derived from authoritative unit/building sources and does not mutate hidden
world simulation.

Acceptance: visibility updates deterministically, explored memory persists,
hidden entities do not become observable through side channels, and equivalent
hidden worlds do not affect simulation outcomes.

### P3.08.01 - Filtered Observations and Events

Filter snapshots and events by player visibility while preserving server
authority and observation immutability. Hidden entities, resources, orders, and
combat events must not cross the protocol boundary.

Acceptance: protocol guards reject malformed filtered data; visible data remains
complete; hidden data is absent; filtered observations do not change the
authoritative simulation or its determinism.

### P3.08.02 - Fog Rendering

Render visible, explored, and unknown areas in the renderer and match HUD. Fog
must be a projection of filtered observations, never a second gameplay model.

Acceptance: the player can see current vision, retained explored terrain, and
hidden terrain feedback through the intended match screen. Browser E2E covers
visibility changes and absence of hidden entities.

### P3.09.01 - Targeting and Pursuit

Make target acquisition and pursuit use visibility, spatial queries, and
deterministic loss-of-vision rules. Preserve explicit order state and avoid
automatic access to hidden coordinates.

Acceptance: targeting tie-breaks are stable, pursuit stops or replans when a
target leaves vision, and attack orders cannot reveal hidden entities.

### P3.10.01 - Projectiles

Replace instant ranged damage where applicable with authoritative projectiles.
Projectiles have deterministic creation, movement, impact, dead-target, and TTL
behavior, with visible renderer feedback.

Acceptance: impacts happen once, dead targets are handled safely, TTL cleanup is
deterministic, snapshots and replays include the required state, and browser
coverage shows the player-facing result.

### P3.11.01 - Area Damage

Add deterministic area damage with explicit radius, falloff, target filtering,
and friendly-fire rules. Use spatial queries instead of frame-order scans.

Acceptance: radius boundaries, falloff, dead targets, and friendly-fire absence
are tested; damage ordering and hashes remain deterministic; browser feedback is
visible.

### P3.12.01 - Combined Army/Chokepoint Stress

Exercise navigation, collision, visibility, projectiles, and area damage in a
repeatable multi-unit chokepoint scenario.

Acceptance: the scenario makes progress without overlap or deadlock, produces
the same result for the same seed and commands, passes performance thresholds,
and runs through the real server and browser path.

## Validation Gates

- Each task: focused unit or simulation tests, typecheck, lint, and relevant
  architecture barriers.
- Navigation state changes: simulation, determinism, snapshot/restore, and
  golden-hash review.
- Protocol or observation changes: contracts, integration, and filtered-data
  tests.
- Player-facing tasks: focused E2E listed before execution, then Chromium and
  Firefox real-server coverage.
- Phase completion: `pnpm run verify`, the complete required browser matrix,
  benchmark evidence for the stress task, and an updated milestone report.

## Non-Goals

- Flow fields, hierarchical pathfinding, or generic local-avoidance research.
- Multiplayer rooms, matchmaking, reconnection, or network scale work.
- AI strategy or bot behavior.
- Replay seek/inspection tooling beyond preserving deterministic state.
- Art expansion beyond the visual feedback needed by the new gameplay states.

## Stop Conditions

Stop a task when its packet acceptance criteria and validation gates pass. Do
not start the next stage with a failing determinism, serialization, or
architecture barrier. Do not mark a gameplay stage complete when its screen,
natural interaction, visible feedback, or browser E2E is missing.
