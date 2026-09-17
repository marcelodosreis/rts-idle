import { DEFAULT_MOVE_SPEED_TILES_PER_SECOND } from '../commands/move.js'
import type { Order } from '../contracts/orders.js'
import { Movement, OrderQueue, Position } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

function shiftOrder(state: GameState, id: number, queue: { readonly orders: readonly Order[] }): void {
  const queues = state.world.store(OrderQueue)
  const rest = queue.orders.slice(1)
  if (rest.length === 0) {
    queues.delete(id)
  } else {
    queues.set(id, { orders: rest })
  }
}

function assignMovement(
  state: GameState,
  id: number,
  movement: { readonly destX: number; readonly destY: number } | undefined,
  x: number,
  y: number
): void {
  const movements = state.world.store(Movement)
  if (movement !== undefined && movement.destX === x && movement.destY === y) {
    return
  }
  movements.set(id, {
    speedTilesPerSecond: DEFAULT_MOVE_SPEED_TILES_PER_SECOND,
    destX: x,
    destY: y,
    remainderX: 0,
    remainderY: 0
  })
}

function clearMovement(state: GameState, id: number): void {
  state.world.store(Movement).delete(id)
}

function handleMoveOrder(
  state: GameState,
  id: number,
  queue: { readonly orders: readonly Order[] },
  position: { readonly x: number; readonly y: number },
  order: { readonly type: 'MOVE' | 'ATTACK_MOVE'; readonly x: number; readonly y: number }
): void {
  const movements = state.world.store(Movement)
  const movement = movements.get(id)
  if (movement === undefined) {
    if (position.x === order.x && position.y === order.y) {
      shiftOrder(state, id, queue)
    } else {
      assignMovement(state, id, undefined, order.x, order.y)
    }
    return
  }
  assignMovement(state, id, movement, order.x, order.y)
}

function patrolTarget(
  order: {
    readonly type: 'PATROL'
    readonly x1: number
    readonly y1: number
    readonly x2: number
    readonly y2: number
  },
  position: { readonly x: number; readonly y: number },
  movement: { readonly destX: number; readonly destY: number } | undefined
): { readonly x: number; readonly y: number } {
  if (movement !== undefined) {
    const onRoute =
      (movement.destX === order.x1 && movement.destY === order.y1) ||
      (movement.destX === order.x2 && movement.destY === order.y2)
    if (onRoute) {
      // Keep walking to the current patrol point; the flip happens on arrival.
      return { x: movement.destX, y: movement.destY }
    }
    return { x: order.x1, y: order.y1 }
  }
  if (position.x === order.x1 && position.y === order.y1) {
    return { x: order.x2, y: order.y2 }
  }
  if (position.x === order.x2 && position.y === order.y2) {
    return { x: order.x1, y: order.y1 }
  }
  return { x: order.x1, y: order.y1 }
}

function handlePatrolOrder(
  state: GameState,
  id: number,
  order: {
    readonly type: 'PATROL'
    readonly x1: number
    readonly y1: number
    readonly x2: number
    readonly y2: number
  },
  position: { readonly x: number; readonly y: number }
): void {
  const movements = state.world.store(Movement)
  const movement = movements.get(id)
  const target = patrolTarget(order, position, movement)
  assignMovement(state, id, movement, target.x, target.y)
}

/**
 * System-order step 3: advance orders and request navigation. The head order
 * drives the unit's Movement (re-targeting on replacement); a completed order
 * shifts the queue. STOP clears the queue via its command; HOLD cancels
 * movement. PATROL alternates between its two points.
 */
export function ordersSystem(state: GameState): void {
  const positions = state.world.store(Position)
  const queues = state.world.store(OrderQueue)
  for (const id of state.world.aliveIds()) {
    const queue = queues.get(id)
    if (queue === undefined || queue.orders.length === 0) {
      continue
    }
    const position = positions.get(id)
    if (position === undefined) {
      continue
    }
    const current = queue.orders[0]!

    if (current.type === 'MOVE' || current.type === 'ATTACK_MOVE') {
      handleMoveOrder(state, id, queue, position, current)
    } else if (current.type === 'PATROL') {
      handlePatrolOrder(state, id, current, position)
    } else if (current.type === 'HOLD') {
      clearMovement(state, id)
    } else if (current.type === 'ATTACK') {
      // Directed attack: no movement (the combat system targets and fires).
    }
  }
}
