# Simulation — rts-idle

The deterministic core. This document is the operational reference for
`packages/simulation`; the architecture and the full design live in
`docs/architecture.md` and `docs/master-plan.md`.

## Portability and determinism

- The core imports no platform APIs: it runs identically in Node, the browser,
  tests, replay, and fuzzing (`tests/architecture/simulation-isolation.test.ts`).
- All randomness is seeded (`createRng`); all arithmetic is integer
  (`packages/shared/src/primitives/fixed.ts`, `packages/simulation/src/movement/destination.ts`).
- The canonical byte format and the state hash are pinned by
  `tests/simulation/hash-golden.test.ts` and the determinism suites. Changing
  the format is a deliberate act (regen the golden).
- `SIMULATION_VERSION` is `0.10.0` (production queues and reserved supply joined
  the canonical snapshot stream).

## Single writer

`Simulation.step()` is the only mutation path (ADR-001 / AGENTS.md). It applies
scheduled commands atomically (rejections leave the state untouched) and then
runs the frozen system pipeline. Commands and snapshots handed to the outside
are independent copies.

## Frozen system order (ADR-013)

The pipeline order is part of the deterministic contract:

| Step | System | Responsibility |
|---|---|---|
| 1 | `orders` | Advance the per-unit order queue (PATROL leg rotation) |
| 2 | `movement` | Advance units toward their destination (integer remainder) |
| 3 | `economy` | Gather minerals, return cargo, and deposit using post-movement positions |
| 4 | `combat` | Resolve attack intent; accumulate damage in the per-tick buffer |
| 5 | `death` | Apply the damage buffer simultaneously; remove the dead, clear refs |
| 6 | `supply` | Recompute used/capacity supply from the live world |
| 7 | `production` | Advance Base/Barracks queues and spawn completed units |
| 8 | `victory` | Decide win/draw/tick-limit; mark losers defeated |
| 9 | `invariants` | Validate the state (never mutates, throws on violation) |

Appending a step is a deliberate change; reordering is forbidden
(`tests/simulation/lifecycle/pipeline-order.test.ts`).

## Components

Registered in `createWorld()` in this order (part of the canonical schema):

- `Position` — fixed-unit x/y.
- `Owner` — competitive slot 0-3.
- `Movement` — speed, destination, integer remainder accumulator.
- `Orders` — the per-unit order queue.
- `Health` — current/max hit points.
- `Combat` — damage, range (tiles), cooldown (ticks), remaining cooldown.
- `Kind` — unit archetype (`pawn` / `warrior` / `archer`), driven by
  `data/unit-stats.ts` per-role combat stats.
- `MineralNode` — remaining mineral amount.
- `Building` — placed building: type, lifecycle status, progress, builder, footprint.
- `Cargo` — a Worker's carried mineral amount and capacity.
- `Production` — a producer's canonical queue, progress, reservations, and
  completion-waiting state.

## Commands

See `docs/commands.md` for the full contract. All commands validate the whole
selection before mutating any unit (command atomicity, P1.02).

## Events

Derived per tick, never persisted in the canonical snapshot, carried to the
client as `events[]` in the snapshot message (master plan §23.2):

- `attackFired` — a unit attacked.
- `damageDealt` — a target took damage (with its resulting health).
- `unitDied` — a unit was removed (with owner and killer).

## Players and victory

`GameState.players` holds the four competitive slots (`defeated`, `gold`). A
player is eliminated when they surrender or lose all living units. The match
finishes when one player remains (win), nobody remains (draw), or the tick
limit is reached (5000 ticks ≈ 4 minutes at 20/s). `phase` becomes `FINISHED`
and is a deterministic flag — the tick keeps advancing so consumers see
liveness.

## Economy v0

`GATHER` is valid for owned pawn Workers with Cargo and a live Mineral Node.
Workers move through the existing straight-line Movement component, complete
one atomic 10-mineral batch after 200 ticks, then return to the nearest owned
Base (distance, then entity id). Nodes permit any number of simultaneous
Workers, and only nodes with complete 10-mineral batches can be gathered.
Partial batch progress is discarded when an order is interrupted; the node and
Cargo remain unchanged. `PlayerState.gold` is the internal v0 mineral wallet
and changes only on deposit. Nodes, cargo, order phase/progress, and wallet
balances are canonical; a dead Worker loses its Cargo component.

## Production v0

Completed Base and Barracks entities own a maximum five-item `Production` queue. `TRAIN`
reserves minerals and supply before adding an item. Pawn items take 100 ticks;
Warrior items cost 100 minerals and take 200 ticks; Archer items cost 125
minerals and take 300 ticks.
The first item is active and later items are queued. Production pauses when
`usedSupply + reservedSupply > supplyCap`. Completed items spawn at the
deterministic Barracks exit, or remain `COMPLETED_WAITING` when that position is
occupied. The queue and `reservedSupply` are canonical and participate in
snapshots, hashes, and replay.

## Serialization

`serializeState`/`deserializeState` write the canonical stream: header,
identity, seed, RNG, next entity id, players, world (entities by id, components
in registration order with presence flags). Transient fields (`events`,
`pendingDamage`) never serialize.
