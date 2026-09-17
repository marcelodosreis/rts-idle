import type { PatrolPayload, ScheduledCommand } from '../contracts/commands.js'
import type { Order } from '../contracts/orders.js'
import { OrderQueue } from '../ecs/components.js'
import { formationOffset } from '../formation.js'
import type { GameState } from '../state/state.js'
import { requireRunning, validateOwnedSelection } from './validate.js'

/**
 * Applies a PATROL command: each selected unit alternates between two points,
 * offset by its formation slot so a group patrols spread out. Replace by
 * default; `append` adds to the queue (master plan §10.1).
 */
export function applyPatrol(state: GameState, command: ScheduledCommand, payload: PatrolPayload): void {
  requireRunning(state, command)
  validateOwnedSelection(state, command, payload.unitIds)
  const queues = state.world.store(OrderQueue)
  const sorted = [...payload.unitIds].sort((a, b) => a - b)
  sorted.forEach((unitId, index) => {
    const offset = formationOffset(index)
    const order: Order = {
      type: 'PATROL',
      x1: payload.x1 + offset.dx,
      y1: payload.y1 + offset.dy,
      x2: payload.x2 + offset.dx,
      y2: payload.y2 + offset.dy
    }
    const existing = queues.get(unitId)
    if (payload.mode === 'append' && existing !== undefined) {
      queues.set(unitId, { orders: [...existing.orders, order] })
    } else {
      queues.set(unitId, { orders: [order] })
    }
  })
}
