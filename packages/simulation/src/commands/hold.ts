import type { ScheduledCommand } from '../contracts/commands.js'
import { clearMovement } from '../movement/destination.js'
import { setOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'
import { validateControllableUnits } from './validate-units.js'

/**
 * HOLD parks the selected units in place with a defensive stance: they stop
 * moving and, once the combat system is live, auto-attack any enemy that comes
 * within range. Clears movement so the unit stays where it is.
 */
export function applyHold(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'HOLD') {
    throw new Error('applyHold: expected a HOLD command')
  }
  const unitIds = command.intent.payload.unitIds
  validateControllableUnits(state, command, unitIds)
  for (const unitId of unitIds) {
    setOrders(state, unitId, [{ type: 'HOLD' }])
    clearMovement(state, unitId)
  }
}
