import type { OrderState } from '@rts/protocol'
import type { Order } from '@rts/simulation'

/** Derives the renderer behavior state from the front order and movement. */
export function deriveOrderState(front: Order | undefined, hasMovement: boolean): OrderState {
  if (front?.type === 'ATTACK') {
    return 'attacking'
  }
  if (front?.type === 'ATTACK_MOVE') {
    return 'attack_move'
  }
  if (front?.type === 'HOLD') {
    return 'hold'
  }
  if (front?.type === 'PATROL') {
    return 'patrol'
  }
  if (front?.type === 'BUILD') {
    return hasMovement ? 'moving' : 'building'
  }
  if (front?.type === 'REPAIR') {
    return 'repairing'
  }
  if (front?.type === 'HEAL') {
    return 'healing'
  }
  return hasMovement ? 'moving' : 'idle'
}
