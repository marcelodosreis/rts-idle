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
| `SURRENDER` | — | The issuing player concedes: marked defeated, their units disband. |

## Rejection codes

| Code | Meaning |
|---|---|
| `INVALID_PAYLOAD` | Selection outside limits, fractional target, bad shape. |
| `INVALID_PHASE` | Command not allowed in the current phase (e.g. re-surrender). |
| `NOT_OWNER` | A unit (or the ATTACK target) does not belong to the player. |
| `ENTITY_UNAVAILABLE` | A unit or target does not exist or is not ownable. |

## Order queue

`Orders` holds a small queue per unit (`MAX_ORDER_QUEUE_DEPTH = 4`). STOP clears
it; MOVE replaces it; HOLD/ATTACK/ATTACK_MOVE set a single standing order;
PATROL sets two alternating legs. The orders system advances the front leg each
tick (see `docs/simulation.md`).

## Transport

The browser transport (`packages/protocol`) validates incoming messages before
they reach the server: a generic `command` message carries the shared
`CommandIntent` (`isCommandMessage`); the legacy `MOVE` message is still
accepted. The server projects snapshots back with `hp/maxHp`, `kind`,
`orderState`, `players`, `phase`, and per-tick `events[]`. The command intent
type lives in `@rts/shared` so protocol and simulation share one definition.