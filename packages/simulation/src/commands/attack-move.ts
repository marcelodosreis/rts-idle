import type { AttackMovePayload, ScheduledCommand } from '../contracts/commands.js'
import type { Order } from '../contracts/orders.js'
import { OrderQueue } from '../ecs/components.js'
import { formationOffset } from '../formation.js'
import type { GameState } from '../state/state.js'
import { requireAlive, requireRunning, validateOwnedSelection } from './validate.js'

/**
 * Applies an ATTACK_MOVE command: advance toward the target point while
 * acquiring enemies in range (master plan §10.1). Each unit's order carries its
 * formation-adjusted destination. Accepts `replace` (default) or `append`.
 */
export function applyAttackMove(state: GameState, command: ScheduledCommand, payload: AttackMovePayload): void {
  requireRunning(state, command)
  requireAlive(state, command)
  validateOwnedSelection(state, command, payload.unitIds)
  const queues = state.world.store(OrderQueue)
  const sorted = [...payload.unitIds].sort((a, b) => a - b)
  sorted.forEach((unitId, index) => {
    const offset = formationOffset(index)
    const order: Order = { type: 'ATTACK_MOVE', x: payload.x + offset.dx, y: payload.y + offset.dy }
    const existing = queues.get(unitId)
    if (payload.mode === 'append' && existing !== undefined) {
      queues.set(unitId, { orders: [...existing.orders, order] })
    } else {
      queues.set(unitId, { orders: [order] })
    }
  })
}
