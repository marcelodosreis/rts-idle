import type { ScheduledCommand } from '../contracts/commands.js'
import { Position } from '../ecs/components.js'
import { setMovementDestination } from '../movement/destination.js'
import { setOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'
import { validateIntegerTarget, validateOwnedUnits } from './validate-units.js'

/**
 * PATROL sets each selected unit to walk back and forth between its current
 * position (the home leg) and the commanded destination (the target leg). The
 * queue alternates both legs; the orders system advances the front leg and
 * re-appends the finished one on arrival.
 */
export function applyPatrol(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'PATROL') {
    throw new Error('applyPatrol: expected a PATROL command')
  }
  const payload = command.intent.payload
  validateOwnedUnits(state, command, payload.unitIds)
  validateIntegerTarget(command, payload.x, payload.y)
  const positions = state.world.store(Position)
  for (const unitId of payload.unitIds) {
    const home = positions.get(unitId)
    if (home === undefined) {
      continue
    }
    setOrders(state, unitId, [
      { type: 'PATROL', x: payload.x, y: payload.y },
      { type: 'PATROL', x: home.x, y: home.y }
    ])
    setMovementDestination(state, unitId, payload.x, payload.y)
  }
}
