import type { EntityId } from '@rts/shared'
import type { Order } from '../contracts/orders.js'
import { AttackTarget } from '../ecs/attack-target-component.js'
import { Orders } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

/** Queue operations preserve the invariant that an Orders component is never empty. */
export function replaceFrontOrder(state: GameState, id: EntityId, order: Order): void {
  const queue = state.world.store(Orders).get(id)?.queue ?? []
  setOrders(state, id, [order, ...queue.slice(1)])
}

export function removeFrontOrder(state: GameState, id: EntityId): void {
  const queue = state.world.store(Orders).get(id)?.queue ?? []
  const remaining = queue.slice(1)
  setOrders(state, id, remaining)
}

export function clearOrders(state: GameState, id: EntityId): void {
  state.world.store(Orders).delete(id)
  state.world.store(AttackTarget).delete(id)
}

export function setOrders(state: GameState, id: EntityId, queue: readonly Order[]): void {
  if (queue.length === 0) {
    clearOrders(state, id)
  } else {
    state.world.store(Orders).set(id, { queue: [...queue] })
    state.world.store(AttackTarget).delete(id)
  }
}
