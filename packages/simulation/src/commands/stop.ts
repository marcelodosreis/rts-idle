import type { ScheduledCommand, StopPayload } from '../contracts/commands.js'
import { Movement, OrderQueue } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { requireRunning, validateOwnedSelection } from './validate.js'

/**
 * Applies a STOP command: clears the order queue and stops movement
 * (master plan §10.1: "Clear orders and stop movement"). Automatic attacks in
 * range remain possible (combat task A9).
 */
export function applyStop(state: GameState, command: ScheduledCommand, payload: StopPayload): void {
  requireRunning(state, command)
  validateOwnedSelection(state, command, payload.unitIds)
  const queues = state.world.store(OrderQueue)
  const movements = state.world.store(Movement)
  for (const unitId of payload.unitIds) {
    queues.delete(unitId)
    movements.delete(unitId)
  }
}
