import type { EntityId, Fixed } from '@rts/shared'

/**
 * Unit orders held by the order queue (master plan §10.1). Movement orders
 * carry their (formation-adjusted) destination; the order system advances the
 * queue as each order completes.
 */
export type Order =
  | { readonly type: 'MOVE'; readonly x: Fixed; readonly y: Fixed }
  | { readonly type: 'ATTACK'; readonly targetId: EntityId }
  | { readonly type: 'ATTACK_MOVE'; readonly x: Fixed; readonly y: Fixed }
  | { readonly type: 'HOLD' }
  | { readonly type: 'PATROL'; readonly x1: Fixed; readonly y1: Fixed; readonly x2: Fixed; readonly y2: Fixed }

/** Player-visible unit state projected to the HUD/snapshot (read-only). */
export type UnitOrderState = 'idle' | 'moving' | 'patrolling' | 'hold' | 'attacking' | 'gathering' | 'working'

/** Derives the player-visible state from the head of the order queue. */
export function deriveOrderState(orders: readonly Order[]): UnitOrderState {
  const current = orders[0]
  if (current === undefined) {
    return 'idle'
  }
  switch (current.type) {
    case 'MOVE':
    case 'ATTACK_MOVE':
      return 'moving'
    case 'ATTACK':
      return 'attacking'
    case 'PATROL':
      return 'patrolling'
    case 'HOLD':
      return 'hold'
  }
}
