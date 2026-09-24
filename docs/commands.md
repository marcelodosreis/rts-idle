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
| `GATHER` | `unitIds, nodeId` | Workers repeatedly gather minerals, return to the nearest owned Base, and deposit. |
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
| `INSUFFICIENT_RESOURCES` | The player cannot afford the command (BUILD). |
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
