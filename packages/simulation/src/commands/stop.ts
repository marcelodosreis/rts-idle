import type { ScheduledCommand } from '../contracts/commands.js'
import { Movement, Orders } from '../ecs/components.js'
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
  const orders = state.world.store(Orders)
  const movements = state.world.store(Movement)
  for (const unitId of unitIds) {
    orders.delete(unitId)
    movements.delete(unitId)
  }
}
