import { CommandRejectedError, type ScheduledCommand } from '../contracts/commands.js'
import { Movement, Owner, Position } from '../ecs/components.js'
import { formationOffset } from '../formation.js'
import type { GameState } from '../state/state.js'
import { MAX_UNITS_PER_COMMAND } from './limits.js'

/** Default movement speed for units without authored stats (tiles per second). */
export const UNIT_SPEED_TILES_PER_SECOND = 4

/**
 * Validates a MOVE command without mutating state.
 * Throws {@link CommandRejectedError} on the first violation; a rejected
 * command must leave the state untouched (command atomicity, master plan §10.3).
 */
function validateMove(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'MOVE') {
    throw new CommandRejectedError('INVALID_PAYLOAD', command, 'MOVE: wrong intent type')
  }
  const payload = command.intent.payload

  if (payload.unitIds.length === 0 || payload.unitIds.length > MAX_UNITS_PER_COMMAND) {
    throw new CommandRejectedError(
      'INVALID_PAYLOAD',
      command,
      `MOVE: unit count ${payload.unitIds.length} outside [1, ${MAX_UNITS_PER_COMMAND}]`
    )
  }
  if (!Number.isInteger(payload.x) || !Number.isInteger(payload.y)) {
    throw new CommandRejectedError('INVALID_PAYLOAD', command, 'MOVE: target must be integer fixed units')
  }

  const owners = state.world.store(Owner)
  for (const unitId of payload.unitIds) {
    if (!state.world.hasEntity(unitId)) {
      throw new CommandRejectedError('ENTITY_UNAVAILABLE', command, `MOVE: entity ${unitId} does not exist`)
    }
    const owner = owners.get(unitId)
    if (owner === undefined) {
      throw new CommandRejectedError('ENTITY_UNAVAILABLE', command, `MOVE: entity ${unitId} is not ownable`)
    }
    if (owner.owner !== command.playerId) {
      throw new CommandRejectedError(
        'NOT_OWNER',
        command,
        `MOVE: player ${command.playerId} does not own entity ${unitId}`
      )
    }
  }
}

/**
 * Applies a MOVE command: distributes the sorted units around the target in a
 * deterministic formation spiral and sets each unit's movement destination.
 * The formation offset depends on the unit's index in the id-sorted list, so
 * the same selection always yields the same destinations (deterministic group
 * movement, master plan §15.3). Units then advance toward their destination
 * one tick at a time via the movement system.
 */
export function applyMove(state: GameState, command: ScheduledCommand): void {
  validateMove(state, command)
  if (command.intent.type !== 'MOVE') {
    return
  }
  const payload = command.intent.payload
  const positions = state.world.store(Position)
  const movements = state.world.store(Movement)
  const sorted = [...payload.unitIds].sort((a, b) => a - b)
  sorted.forEach((unitId, index) => {
    const offset = formationOffset(index)
    const destX = payload.x + offset.dx
    const destY = payload.y + offset.dy
    const current = positions.get(unitId)
    // Already at the destination: nothing to move.
    if (current !== undefined && current.x === destX && current.y === destY) {
      movements.delete(unitId)
      return
    }
    movements.set(unitId, {
      speedTilesPerSecond: UNIT_SPEED_TILES_PER_SECOND,
      destX,
      destY,
      remainderX: 0,
      remainderY: 0
    })
  })
}
