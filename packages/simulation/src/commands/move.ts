import { CommandRejectedError, type ScheduledCommand } from '../contracts/commands.js'
import { Owner, Position } from '../ecs/components.js'
import { formationOffset } from '../formation.js'
import type { GameState } from '../state/state.js'
import { MAX_UNITS_PER_COMMAND } from './limits.js'

/**
 * Validates a MOVE command without mutating state.
 * Throws {@link CommandRejectedError} on the first violation; a rejected
 * command must leave the state untouched (command atomicity, master plan §10.3).
 */
function validateMove(state: GameState, command: ScheduledCommand): void {
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
 * deterministic formation spiral. The formation offset depends on the unit's
 * index in the id-sorted list, so the same selection always yields the same
 * destinations (deterministic group movement, master plan §15.3).
 */
export function applyMove(state: GameState, command: ScheduledCommand): void {
  validateMove(state, command)
  const payload = command.intent.payload
  const positions = state.world.store(Position)
  const sorted = [...payload.unitIds].sort((a, b) => a - b)
  sorted.forEach((unitId, index) => {
    const offset = formationOffset(index)
    positions.set(unitId, { x: payload.x + offset.dx, y: payload.y + offset.dy })
  })
}
