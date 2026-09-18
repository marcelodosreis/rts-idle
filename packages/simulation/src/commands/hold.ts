import type { ScheduledCommand } from '../contracts/commands.js'
import { Movement, Orders } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { validateOwnedUnits } from './validate-units.js'

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
  validateOwnedUnits(state, command, unitIds)
  const orders = state.world.store(Orders)
  const movements = state.world.store(Movement)
  for (const unitId of unitIds) {
    orders.set(unitId, { queue: [{ type: 'HOLD' }] })
    movements.delete(unitId)
  }
}
