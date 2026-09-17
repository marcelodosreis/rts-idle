import type { HoldPayload, ScheduledCommand } from '../contracts/commands.js'
import { Movement, OrderQueue } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { requireRunning, validateOwnedSelection } from './validate.js'

/**
 * Applies a HOLD command: the unit stands ground with a HOLD order, so it does
 * not chase or move but can attack targets in range (combat task A10).
 */
export function applyHold(state: GameState, command: ScheduledCommand, payload: HoldPayload): void {
  requireRunning(state, command)
  validateOwnedSelection(state, command, payload.unitIds)
  const queues = state.world.store(OrderQueue)
  const movements = state.world.store(Movement)
  for (const unitId of payload.unitIds) {
    queues.set(unitId, { orders: [{ type: 'HOLD' }] })
    movements.delete(unitId)
  }
}
