import { UNIT_SPEED_TILES_PER_SECOND } from '../commands/move.js'
import { Movement, Orders } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

/**
 * Order-queue system: advances the front of each unit's order queue. Runs
 * before movement so a finished patrol leg is re-armed the same tick it
 * arrives. PATROL rotates between its two legs on arrival; STOP clears the
 * queue via its command; HOLD/ATTACK/ATTACK_MOVE keep the queue intact and are
 * driven by the combat system (master plan P1.03).
 */
export function ordersSystem(state: GameState): void {
  const orders = state.world.store(Orders)
  const movements = state.world.store(Movement)
  for (const id of state.world.aliveIds()) {
    const orderData = orders.get(id)
    if (orderData === undefined) {
      continue
    }
    const queue = [...orderData.queue]
    if (queue.length === 0) {
      orders.delete(id)
      continue
    }
    const front = queue[0]!
    if (front.type === 'PATROL' && movements.get(id) === undefined) {
      const rotated = [...queue.slice(1), front]
      orders.set(id, { queue: rotated })
      const next = rotated[0]!
      if (next.type === 'PATROL') {
        movements.set(id, {
          speedTilesPerSecond: UNIT_SPEED_TILES_PER_SECOND,
          destX: next.x,
          destY: next.y,
          remainderX: 0,
          remainderY: 0
        })
      }
    }
  }
}
