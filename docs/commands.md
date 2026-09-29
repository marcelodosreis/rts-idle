# Commands — rts-idle

Authoritative command contract (master plan P1.01). A `ScheduledCommand` is
`{ tick, playerId, sequence, intent }`; the engine collects `CommandRejectedError`
for invalid commands without mutating state (atomicity, P1.02).

All unit-list commands validate the full selection before applying to any unit:
every unit must exist, be ownable, and belong to the issuing player, and the
selection must be within `MAX_UNITS_PER_COMMAND` (256). Positional targets must
be integer fixed units.

## Command union

| Type | Payload | Behavior |
|---|---|---|
| `MOVE` | `unitIds, x, y` | Walk to a destination in a deterministic formation spiral; replaces standing orders. |
| `STOP` | `unitIds` | Cancel movement and the order queue. |
| `HOLD` | `unitIds` | Park in place with a defensive stance (auto-attacks enemies in range). |
| `PATROL` | `unitIds, x, y` | Walk back and forth between the current position and the target. |
| `ATTACK` | `unitIds, targetId` | Acquire and attack a specific enemy (chases when out of range). |
| `ATTACK_MOVE` | `unitIds, x, y` | Move to a destination, attacking enemies encountered en route; defend on arrival. |
| `GATHER` | `unitIds, nodeId` | Pawns repeatedly gather Minerals, return to the nearest owned Castle, and deposit. |
| `TRAIN` | `producerId, unitKind` | Queue the unit allowed by the selected owned completed producer, reserving Minerals and supply. |
| `RESEARCH` | `monasteryId, researchType` | Queue one of the four Tier II researches at an owned completed Monastery. |
| `CANCEL_RESEARCH` | `monasteryId, queueIndex` | Cancel a research item and refund according to its authoritative queue state. |
| `CANCEL_PRODUCTION` | `producerId, queueIndex` | Cancel any item in an owned producer queue, refunding according to its state and releasing its reserved supply. |
| `CANCEL_CONSTRUCTION` | `buildingId` | Cancel an owned not-yet-completed construction: refund part of the cost and free its footprint (see below). |
| `SURRENDER` | — | The issuing player concedes: marked defeated, their units disband. |

## Construction cancellation (P2.05)

`CANCEL_CONSTRUCTION { buildingId }` is valid only for a construction owned by
the issuing player whose `status` is not `COMPLETED` (otherwise `INVALID_STATE`).
It credits a partial refund, detaches the builder (clearing its `BUILD` order and
movement), and removes the building so its footprint is freed. The worker stays
where it is. The refund uses integer arithmetic with an explicit denominator:

```text
refund = floor(costMinerals * (totalTicks - progressTicks) * 3 / (totalTicks * 4))
```

A not-yet-started foundation (progress 0) refunds 75% of the cost; the formula
lives in `@rts/shared` (`constructionRefund`) so the simulation and the HUD
estimate agree. The HUD reports the value as an estimate; the simulation is the
authority.

## Rejection codes

| Code | Meaning |
|---|---|
| `INVALID_PAYLOAD` | Selection outside limits, fractional target, bad shape. |
| `INVALID_PHASE` | Command not allowed in the current phase (e.g. re-surrender). |
| `INVALID_PLACEMENT` | Building placement is out of bounds, invalid, or overlapping. |
| `INVALID_STATE` | Command rejected by the target's state (e.g. cancelling a completed building). |
| `INSUFFICIENT_RESOURCES` | The player cannot afford the command or has no available supply (BUILD/TRAIN). |
| `NOT_OWNER` | A unit (or the ATTACK target) does not belong to the player. |
| `ENTITY_UNAVAILABLE` | A unit or target does not exist or is not ownable. |

## Order queue

`Orders` holds a small queue per unit (`MAX_ORDER_QUEUE_DEPTH = 4`). STOP clears
it; MOVE replaces it; HOLD/ATTACK/ATTACK_MOVE/GATHER set a single standing
order; PATROL sets two alternating legs. GATHER also stores its canonical
travel/gather/return phase and collection progress. The systems advance the
front order each tick (see `docs/simulation.md`).

## Transport

The browser transport (`packages/protocol`) validates incoming messages before
they reach the server: a generic `command` message carries the shared
`CommandIntent` (`isCommandMessage`); the legacy `MOVE` message is still
accepted. The server projects snapshots back with `hp/maxHp`, `kind`,
`orderState`, optional Worker economy phase/progress/cargo, separate `bases[]`
and `mineralNodes[]` observations, `players`, `phase`, and per-tick `events[]`.
The command intent type lives in
`@rts/shared` so protocol and simulation share one definition.

## Production (P2.07)

The current production contract accepts Pawn at Castle, Warrior/Lancer at
Barracks, Archer at Archery, and Monk at Monastery. Lancer and Monk require the
player's Tier II unlock.
The queue holds at most five items and reserves the mineral cost and one supply
per item at acceptance. The authoritative production definitions, including the
balance for all three trainable unit kinds, live in `@rts/game-data` and are
centralized in `UNIT_PRODUCTION_DEFINITIONS`.

One item advances per producer. Production pauses while
`usedSupply + reservedSupply > supplyCap`. A completed item spawns at the
deterministic producer exit when space is available; otherwise it remains in
`COMPLETED_WAITING`, retaining its reservations until the exit is free.

`RALLY` sets an owned completed Castle, Barracks, Archery, or Monastery producer's fixed-coordinate
rally point. The point is projected on buildings, and a newly spawned unit
receives the existing movement destination when the point is configured.

## Production cancellation (P2.09)

`CANCEL_PRODUCTION { producerId, queueIndex }` is valid only for an owned,
completed Base or Barracks and a `QUEUED` item. Active and
`COMPLETED_WAITING` items reject cancellation. The index is resolved against
the canonical queue at command application time; removing a queued item
preserves the relative order of the remaining items.

Queued items refund their full reserved mineral cost and release their reserved
supply. Removing a producer discards its complete queue
and releases all reservations without refund; building combat and building
health are outside this contract.
