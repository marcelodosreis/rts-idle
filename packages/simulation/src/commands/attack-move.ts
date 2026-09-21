import type { ScheduledCommand } from '../contracts/commands.js'
import { setMovementDestination } from '../movement/destination.js'
import { setOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'
import { validateIntegerTarget, validateOwnedUnits } from './validate-units.js'

/**
 * ATTACK_MOVE orders the selected units to move to a destination while
 * attacking any enemy that comes within range along the way. On arrival the
 * order stays: the units defend the destination (the combat system drives
 * both the movement-cancel-on-engagement and the post-arrival auto-attack).
 */
export function applyAttackMove(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'ATTACK_MOVE') {
    throw new Error('applyAttackMove: expected an ATTACK_MOVE command')
  }
  const payload = command.intent.payload
  validateOwnedUnits(state, command, payload.unitIds)
  validateIntegerTarget(command, payload.x, payload.y)
  for (const unitId of payload.unitIds) {
    setOrders(state, unitId, [{ type: 'ATTACK_MOVE', x: payload.x, y: payload.y }])
    setMovementDestination(state, unitId, payload.x, payload.y)
  }
}
