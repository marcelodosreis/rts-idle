import { assertNever } from '@rts/shared'
import { CommandRejectedError, type ScheduledCommand } from '../contracts/commands.js'
import type { GameState } from '../state/state.js'
import { applyAttack } from './attack.js'
import { applyAttackMove } from './attack-move.js'
import { applyBuild } from './build.js'
import { applyCancelConstruction } from './cancel-construction.js'
import { applyCancelProduction } from './cancel-production.js'
import { applyDeposit } from './deposit.js'
import { applyGather } from './gather.js'
import { applyHold } from './hold.js'
import { applyMove } from './move.js'
import { applyPatrol } from './patrol.js'
import { applyRally } from './rally.js'
import { applyRepair } from './repair.js'
import { applyStop } from './stop.js'
import { applySurrender } from './surrender.js'
import { applyTrain } from './train.js'

/** Shared admission boundary: handlers only validate command-specific data. */
function assertCommandAdmissible(state: GameState, command: ScheduledCommand): void {
  if (state.phase !== 'RUNNING') {
    throw new CommandRejectedError('INVALID_PHASE', command, `${command.intent.type}: game is not running`)
  }
  const player = state.players.find((candidate) => candidate.id === command.playerId)
  if (player === undefined || player.defeated) {
    throw new CommandRejectedError(
      'INVALID_PHASE',
      command,
      `${command.intent.type}: player ${command.playerId} is not active`
    )
  }
}

/**
 * Dispatches a scheduled command to its handler. Every command type validates
 * before mutating (atomicity, master plan §10.3); a rejected command throws
 * {@link CommandRejectedError}, which the engine collects as `rejected`.
 */
export function applyCommand(state: GameState, command: ScheduledCommand): void {
  assertCommandAdmissible(state, command)
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
    case 'GATHER':
      applyGather(state, command)
      return
    case 'DEPOSIT':
      applyDeposit(state, command)
      return
    case 'BUILD':
      applyBuild(state, command)
      return
    case 'CANCEL_CONSTRUCTION':
      applyCancelConstruction(state, command)
      return
    case 'TRAIN':
      applyTrain(state, command)
      return
    case 'CANCEL_PRODUCTION':
      applyCancelProduction(state, command)
      return
    case 'RALLY':
      applyRally(state, command)
      return
    case 'REPAIR':
      applyRepair(state, command)
      return
    case 'SURRENDER':
      applySurrender(state, command)
      return
    default:
      assertNever(command.intent, 'applyCommand')
  }
}
