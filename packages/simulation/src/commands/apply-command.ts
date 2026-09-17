import { CommandRejectedError, type ScheduledCommand } from '../contracts/commands.js'
import type { GameState } from '../state/state.js'
import { applyHold } from './hold.js'
import { applyMove } from './move.js'
import { applyPatrol } from './patrol.js'
import { validateCommandShape } from './schema.js'
import { applyStop } from './stop.js'

/**
 * Dispatches a scheduled command to its handler. Every command first validates
 * its structural shape (schema), then the handler validates context before
 * mutating (atomicity, master plan §10.3). A rejected command throws
 * {@link CommandRejectedError}, which the engine collects as `rejected`.
 * Commands from later phases validate but are not implemented yet, so they are
 * rejected explicitly rather than silently ignored.
 */
export function applyCommand(state: GameState, command: ScheduledCommand): void {
  validateCommandShape(command)
  switch (command.intent.type) {
    case 'MOVE':
      applyMove(state, command, command.intent.payload)
      return
    case 'STOP':
      applyStop(state, command, command.intent.payload)
      return
    case 'HOLD':
      applyHold(state, command, command.intent.payload)
      return
    case 'PATROL':
      applyPatrol(state, command, command.intent.payload)
      return
    case 'ATTACK':
    case 'ATTACK_MOVE':
    case 'GATHER':
    case 'RETURN_CARGO':
    case 'BUILD':
    case 'TRAIN':
    case 'RESEARCH':
    case 'RALLY':
    case 'REPAIR':
    case 'CANCEL_CONSTRUCTION':
    case 'CANCEL_PRODUCTION':
    case 'CANCEL_RESEARCH':
    case 'USE_ABILITY':
    case 'SURRENDER':
      throw new CommandRejectedError(
        'ORDER_NOT_SUPPORTED',
        command,
        `${command.intent.type}: not implemented in this version`
      )
  }
}
