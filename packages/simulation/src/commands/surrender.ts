import type { ScheduledCommand } from '../contracts/commands.js'
import type { GameState } from '../state/state.js'
import { defeatPlayerSystem } from '../systems/defeat-system.js'
import { requireAlive, requireRunning } from './validate.js'

/**
 * Applies a SURRENDER command: the issuing player gives up (master plan §10.1).
 * Their entities are deactivated and they stop keeping the match alive.
 */
export function applySurrender(state: GameState, command: ScheduledCommand): void {
  requireRunning(state, command)
  requireAlive(state, command)
  defeatPlayerSystem(state, command.playerId)
}
