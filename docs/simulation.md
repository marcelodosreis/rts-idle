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
- `SIMULATION_VERSION` is `0.21.0`; canonical state includes the static/current
  navigation definitions, bounded searches, building-footprint invalidation, and
  persisted movement routes.

## Single writer

`Simulation.step()` is the only mutation path (ADR-001 / AGENTS.md). It applies
scheduled commands atomically (rejections leave the state untouched) and then
runs the frozen system pipeline. Commands and snapshots handed to the outside
are independent copies.

## Frozen system order (ADR-013)

The pipeline order is part of the deterministic contract:

| Step | System | Responsibility |
|---|---|---|
| 1 | `orders` | Synchronize building footprints, run the bounded navigation budget, and advance the per-unit order queue (PATROL leg rotation) |
| 2 | `movement` | Advance units toward their destination (integer remainder) |
| 3 | `economy` | Gather resources, return cargo, and deposit using post-movement positions |
| 4 | `heal` | Resolve Monk healing orders and cooldowns |
| 5 | `tier` | Complete Castle tier upgrades and unlock current Tier II access |
| 6 | `research` | Advance Monastery queues and apply completed modifiers |
| 7 | `combat` | Resolve attack intent; accumulate damage in the per-tick buffer |
| 8 | `death` | Apply the damage buffer simultaneously; remove the dead, clear refs |
| 9 | `supply` | Recompute used/capacity supply from the live world |
| 10 | `production` | Advance Castle/producer queues and spawn completed units |
| 11 | `victory` | Decide win/draw/tick-limit; mark losers defeated |
| 12 | `invariants` | Validate the state (never mutates, throws on violation) |

Appending a step is a deliberate change; reordering is forbidden
(`tests/simulation/lifecycle/pipeline-order.test.ts`).

## Components

Registered in `createWorld()` in this order (part of the canonical schema):

- `Position` — fixed-unit x/y.
- `Owner` — competitive slot 0-3.
- `Movement` — speed, destination, integer remainder accumulator, route, and
  deterministic blockage counter.
- `Orders` — the per-unit order queue.
- `Health` — current/max hit points.
- `Combat` — damage, range (tiles), cooldown (ticks), remaining cooldown.
- `Kind` — unit archetype (`pawn` / `warrior` / `archer` / `lancer` / `monk`),
  driven by the declarative definitions in `packages/game-data/src/units.ts`.
- Map-authored resources are not ECS components: `GameState.resources` holds
  the immutable `ResourceCatalog` plus compact remaining amounts (see
  "Economy v0").
- `Building` — placed building: type, lifecycle status, progress, builder, footprint.
- `Cargo` — a Worker's carried resource amount, capacity, and `resourceType`.
- `Production` — a producer's canonical queue, progress, reservations, and
  completion-waiting state.
- `Production` — a producer's canonical FIFO queue, including Monk training and
  Research entries for Monasteries.

## Commands

See `docs/commands.md` for the full contract. All commands validate the whole
selection before mutating any unit (command atomicity, P1.02).

## Events

Derived per tick, never persisted in the canonical snapshot, carried to the
client as `events[]` in the snapshot message (master plan §23.2):

- `attackFired` — a unit attacked.
- `damageDealt` — a target took damage (with its resulting health).
- `unitDied` — a unit was removed (with owner and killer).
- `movementBlocked` — a unit remained blocked or unreachable for the notification
  threshold.

## Players and victory

`GameState.players` holds the four competitive slots (`defeated`, `resources`
with canonical `GOLD` and `WOOD` balances). A
player is eliminated when they surrender or lose all living units. The match
finishes when one player remains (win), nobody remains (draw), or the tick
limit is reached (5000 ticks ≈ 4 minutes at 20/s). `phase` becomes `FINISHED`
and is a deterministic flag — the tick keeps advancing so consumers see
liveness.

## Economy v0

`GATHER` is valid for owned pawn Workers with Cargo and a live resource
(a `TREE` yields Wood, a `GOLD_MINE` yields Gold). Workers move through the
existing straight-line Movement component, complete one atomic
`harvestAmount` batch after `harvestTicks`, then return to the nearest owned
Castle (distance, then entity id). Resources permit any number of simultaneous
Workers, and only resources with a complete batch can be gathered. Partial
batch progress is discarded when an order is interrupted; the resource and
Cargo remain unchanged. `PlayerState.resources` is the authoritative
Gold/Wood wallet and changes only on deposit. Resource amounts, cargo, order
phase/progress, and wallet balances are canonical; a dead Worker loses its
Cargo component.

## Production v0

Completed Castle, Barracks, Archery, and Monastery entities own a maximum five-item `Production` queue. `TRAIN`
reserves resources and supply before adding an item. Pawn items take 100 ticks;
Warrior items cost 100 gold and take 200 ticks; Archer items cost 125
gold and take 300 ticks.
The first item is active and later items are queued. Production pauses when
`usedSupply + reservedSupply > supplyCap`. Completed items spawn at the
deterministic producer exit, or remain `COMPLETED_WAITING` when that position is
unavailable. The queue, `reservedSupply`, and producer rally point are canonical
and participate in snapshots, hashes, and replay. A configured rally point
becomes the spawned unit's normal movement destination.

`CANCEL_PRODUCTION` removes one `QUEUED` item by canonical index. Active and
`COMPLETED_WAITING` items reject cancellation. A queued item refunds its full
resource cost and releases its reserved supply without reordering the rest of
the queue. The authoritative producer-removal lifecycle releases all queue
reservations and never refunds production costs.

## Research v0

Completed Monasteries accept a maximum five-item shared Monk/Research queue. `RESEARCH`
reserves resources atomically and `CANCEL_RESEARCH` uses the production refund
rule. Attack, Defense, Economy, and Movement are single-level global
technologies. Their capabilities affect existing and future units without
changing static unit definitions. Research state is canonical and deterministic.

## Serialization

`serializeState`/`deserializeState` write the canonical stream: header,
identity, seed, RNG, next entity id, players, world (entities by id, components
in registration order with presence flags). Transient fields (`events`,
`pendingDamage`) never serialize.
