import type { ScheduledCommand } from '../contracts/commands.js'
import type { GameState } from '../state/state.js'
import { applyAttack } from './attack.js'
import { applyAttackMove } from './attack-move.js'
import { applyHold } from './hold.js'
import { applyMove } from './move.js'
import { applyPatrol } from './patrol.js'
import { applyStop } from './stop.js'

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
    case 'STOP':
      applyStop(state, command)
      return
    case 'HOLD':
      applyHold(state, command)
      return
    case 'PATROL':
      applyPatrol(state, command)
      return
    case 'ATTACK':
      applyAttack(state, command)
      return
    case 'ATTACK_MOVE':
      applyAttackMove(state, command)
      return
  }
}
