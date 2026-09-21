import type { ScheduledCommand } from '../contracts/commands.js'
import { clearMovement } from '../movement/destination.js'
import { clearOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'
import { validateOwnedUnits } from './validate-units.js'

/**
 * STOP cancels every order and any movement for the selected units (order
 * cancellation, master plan P1.03). Validates the full selection before
 * mutating any unit.
 */
export function applyStop(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'STOP') {
    throw new Error('applyStop: expected a STOP command')
  }
  const unitIds = command.intent.payload.unitIds
  validateOwnedUnits(state, command, unitIds)
  for (const unitId of unitIds) {
    clearOrders(state, unitId)
    clearMovement(state, unitId)
  }
}
