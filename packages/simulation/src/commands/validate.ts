import type { EntityId } from '@rts/shared'
import { CommandRejectedError, type ScheduledCommand } from '../contracts/commands.js'
import { Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

/**
 * Validates that every entity in `ids` exists, is ownable, and belongs to the
 * command issuer. Throws {@link CommandRejectedError} with the appropriate
 * code; used by all selection-based commands before any mutation (atomicity,
 * master plan §10.3).
 */
export function validateOwnedSelection(state: GameState, command: ScheduledCommand, ids: readonly EntityId[]): void {
  const owners = state.world.store(Owner)
  for (const entityId of ids) {
    if (!state.world.hasEntity(entityId)) {
      throw new CommandRejectedError('ENTITY_UNAVAILABLE', command, `entity ${entityId} does not exist`)
    }
    const owner = owners.get(entityId)
    if (owner === undefined) {
      throw new CommandRejectedError('ENTITY_UNAVAILABLE', command, `entity ${entityId} is not ownable`)
    }
    if (owner.owner !== command.playerId) {
      throw new CommandRejectedError('NOT_OWNER', command, `player ${command.playerId} does not own entity ${entityId}`)
    }
  }
}

/** Rejects commands issued after the match has finished (INVALID_PHASE). */
export function requireRunning(state: GameState, command: ScheduledCommand): void {
  if (state.phase !== 'RUNNING') {
    throw new CommandRejectedError('INVALID_PHASE', command, `match is ${state.phase}`)
  }
}

/** Rejects commands from a defeated player (their entities are inactive, §11.6). */
export function requireAlive(state: GameState, command: ScheduledCommand): void {
  if (state.players[command.playerId]?.defeated === true) {
    throw new CommandRejectedError('INVALID_PHASE', command, `player ${command.playerId} is defeated`)
  }
}
