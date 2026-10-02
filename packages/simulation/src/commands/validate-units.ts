import { unitCanAttack } from '@rts/game-data'
import { CommandRejectedError, type ScheduledCommand } from '../contracts/commands.js'
import { Kind, Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { MAX_UNITS_PER_COMMAND } from './limits.js'

/**
 * Shared command validation: every unit must exist, be ownable, and belong to
 * the issuing player. The selection must be within the per-command unit limit.
 * Validates the full list before any command mutates state (atomicity,
 * master plan §10.3): a rejected command leaves the state untouched.
 */
export function validateOwnedUnits(state: GameState, command: ScheduledCommand, unitIds: readonly number[]): void {
  if (unitIds.length === 0 || unitIds.length > MAX_UNITS_PER_COMMAND) {
    throw new CommandRejectedError(
      'INVALID_PAYLOAD',
      command,
      `${command.intent.type}: unit count ${unitIds.length} outside [1, ${MAX_UNITS_PER_COMMAND}]`
    )
  }
  const owners = state.world.store(Owner)
  for (const unitId of unitIds) {
    if (!state.world.hasEntity(unitId)) {
      throw new CommandRejectedError(
        'ENTITY_UNAVAILABLE',
        command,
        `${command.intent.type}: entity ${unitId} does not exist`
      )
    }
    const owner = owners.get(unitId)
    if (owner === undefined) {
      throw new CommandRejectedError(
        'ENTITY_UNAVAILABLE',
        command,
        `${command.intent.type}: entity ${unitId} is not ownable`
      )
    }
    if (owner.owner !== command.playerId) {
      throw new CommandRejectedError(
        'NOT_OWNER',
        command,
        `${command.intent.type}: player ${command.playerId} does not own entity ${unitId}`
      )
    }
  }
}

/** Rejects offensive orders that include a support-only Monk. */
export function validateAttackCapableUnits(
  state: GameState,
  command: ScheduledCommand,
  unitIds: readonly number[]
): void {
  validateOwnedUnits(state, command, unitIds)
  const kinds = state.world.store(Kind)
  for (const unitId of unitIds) {
    if (!unitCanAttack(kinds.get(unitId))) {
      throw new CommandRejectedError('INVALID_STATE', command, `${command.intent.type}: Monk cannot attack`)
    }
  }
}

/**
 * Shared payload validation for commands carrying a fixed target position:
 * coordinates must be integers (the canonical stream stores integer fixed
 * units, master plan §15).
 */
export function validateIntegerTarget(command: ScheduledCommand, x: number, y: number): void {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new CommandRejectedError(
      'INVALID_PAYLOAD',
      command,
      `${command.intent.type}: target must be integer fixed units`
    )
  }
}
