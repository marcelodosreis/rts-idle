import type { ScheduledCommand } from '../contracts/commands.js'
import { formationOffset } from '../domain/formation.js'
import { setMovementDestination } from '../movement/destination.js'
import { clearOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'
import { validateControllableUnits, validateIntegerTarget } from './validate-units.js'

export { UNIT_SPEED_TILES_PER_SECOND } from '../movement/destination.js'

/**
 * Applies a MOVE command: distributes the sorted units around the target in a
 * deterministic formation spiral and sets each unit's movement destination.
 * The formation offset depends on the unit's index in the id-sorted list, so
 * the same selection always yields the same destinations (deterministic group
 * movement, master plan §15.3). Units then advance toward their destination
 * one tick at a time via the movement system.
 */
export function applyMove(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'MOVE') {
    throw new Error('applyMove: expected a MOVE command')
  }
  const payload = command.intent.payload
  validateControllableUnits(state, command, payload.unitIds)
  validateIntegerTarget(command, payload.x, payload.y)
  const sorted = [...payload.unitIds].sort((a, b) => a - b)
  sorted.forEach((unitId, index) => {
    // A MOVE replaces any standing order for the unit (order replacement,
    // master plan P1.03).
    clearOrders(state, unitId)
    const offset = formationOffset(index)
    const destX = payload.x + offset.dx
    const destY = payload.y + offset.dy
    setMovementDestination(state, unitId, destX, destY)
  })
}
