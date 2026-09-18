import { CommandRejectedError, type ScheduledCommand } from '../contracts/commands.js'
import { Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

/**
 * SURRENDER concedes the match for the issuing player: their slot is marked
 * defeated and their units are disbanded from the world. Rejected when the
 * game has finished or the player already surrendered.
 */
export function applySurrender(state: GameState, command: ScheduledCommand): void {
  if (state.phase !== 'RUNNING') {
    throw new CommandRejectedError('INVALID_PHASE', command, 'SURRENDER: game is not running')
  }
  const playerId = command.playerId
  const player = state.players.find((candidate) => candidate.id === playerId)
  if (player === undefined || player.defeated) {
    throw new CommandRejectedError('INVALID_PHASE', command, `SURRENDER: player ${playerId} already defeated`)
  }
  player.defeated = true
  const owners = state.world.store(Owner)
  for (const id of state.world.aliveIds()) {
    const owner = owners.get(id)
    if (owner !== undefined && owner.owner === playerId) {
      state.world.removeEntity(id)
    }
  }
}
