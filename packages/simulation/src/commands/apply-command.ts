import type { ScheduledCommand } from '../contracts/commands.js'
import type { GameState } from '../state/state.js'
import { applyMove } from './move.js'

/**
 * Dispatches a scheduled command to its handler. Every command type validates
 * before mutating (atomicity, master plan §10.3); a rejected command throws
 * {@link CommandRejectedError}, which the engine collects as `rejected`.
 */
export function applyCommand(state: GameState, command: ScheduledCommand): void {
  switch (command.intent.type) {
    case 'MOVE':
      applyMove(state, command)
      return
  }
}
