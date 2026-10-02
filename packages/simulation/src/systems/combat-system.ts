import { unitCanAttack } from '@rts/game-data'
import { distSquaredFixed, type EntityId, FIXED_SCALE } from '@rts/shared'
import type { Order } from '../contracts/orders.js'
import { isCloserCandidate } from '../domain/building-predicates.js'
import { effectiveArmor, effectiveDamage } from '../domain/research-effects.js'
import { Combat, Kind, Orders, Owner, Position } from '../ecs/components.js'
import { clearMovement, setMovementDestination } from '../movement/destination.js'
import { clearOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'

/**
 * Finds the nearest living enemy within range, or `null`. Iteration follows
 * alive-ids order and strictly-lower distances, so a tie resolves to the
 * lowest id — deterministic (master plan §11).
 */
function nearestEnemyInRange(
  state: GameState,
  selfId: EntityId,
  position: { readonly x: number; readonly y: number },
  ownerId: number,
  rangeFixed: number
): EntityId | null {
  const positions = state.world.store(Position)
  const owners = state.world.store(Owner)
  let best: EntityId | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const other of state.world.query(Position)) {
    if (other === selfId) {
      continue
    }
    const otherOwner = owners.get(other)
    if (otherOwner === undefined || otherOwner.owner === ownerId) {
      continue
    }
    const otherPosition = positions.get(other)
    if (otherPosition === undefined) {
      continue
    }
    const distance = distSquaredFixed(position.x, position.y, otherPosition.x, otherPosition.y)
    if (distance <= rangeFixed * rangeFixed && isCloserCandidate(distance, other, bestDistance, best)) {
      bestDistance = distance
      best = other
    }
  }
  return best
}

interface TargetQuery {
  readonly state: GameState
  readonly id: EntityId
  readonly front: Order
  readonly position: { readonly x: number; readonly y: number }
  readonly ownerId: number
  readonly rangeFixed: number
}

/**
 * Resolves a combat unit's target from its front order. ATTACK commits to the
 * commanded target (clearing the order when the target is gone); HOLD and
 * ATTACK_MOVE auto-acquire the nearest enemy in range.
 */
function resolveTarget(query: TargetQuery): EntityId | null {
  const { state, id, front, position, ownerId, rangeFixed } = query
  if (front.type === 'ATTACK') {
    if (!state.world.hasEntity(front.targetId)) {
      clearOrders(state, id)
      return null
    }
    return front.targetId
  }
  if (front.type === 'HOLD' || front.type === 'ATTACK_MOVE') {
    return nearestEnemyInRange(state, id, position, ownerId, rangeFixed)
  }
  return null
}

/**
 * Adds an attack's damage to the per-tick buffer and starts the cooldown.
 * Damage is not applied yet: the death step resolves the full tick's
 * simultaneous damage.
 */
function accumulateDamage(state: GameState, targetId: EntityId, attackerId: EntityId, damage: number): void {
  const existing = state.pendingDamage.get(targetId)
  state.pendingDamage.set(targetId, {
    amount: (existing?.amount ?? 0) + damage,
    attackerId
  })
  state.events.push({ type: 'attackFired', attackerId, targetId })
}

/**
 * Combat step 13 (master plan P1.05): resolves each combat unit's attack
 * intent for the tick. ATTACK orders chase and fire at their target;
 * HOLD and ATTACK_MOVE auto-acquire the nearest enemy in range. Fired damage
 * is accumulated in the per-tick buffer instead of applying immediately, so
 * death resolution (step 14) sees the full tick's simultaneous damage.
 * Emits `attackFired` for every attack performed.
 */
export function combatSystem(state: GameState): void {
  const positions = state.world.store(Position)
  const owners = state.world.store(Owner)
  const combats = state.world.store(Combat)
  const kinds = state.world.store(Kind)
  const orders = state.world.store(Orders)

  for (const id of state.world.query(Combat)) {
    const combat = combats.get(id)
    if (combat === undefined) {
      continue
    }
    if (!unitCanAttack(kinds.get(id))) {
      continue
    }
    const position = positions.get(id)
    const owner = owners.get(id)
    if (position === undefined || owner === undefined) {
      continue
    }

    const cooldownRemaining = Math.max(0, combat.cooldownRemaining - 1)
    combats.set(id, { ...combat, cooldownRemaining })

    const front = orders.get(id)?.queue[0]
    if (front === undefined) {
      continue
    }

    const rangeFixed = combat.rangeTiles * FIXED_SCALE
    const targetId = resolveTarget({ state, id, front, position, ownerId: owner.owner, rangeFixed })
    if (targetId === null) {
      continue
    }
    const targetPosition = positions.get(targetId)
    if (targetPosition === undefined) {
      continue
    }

    const inRange =
      distSquaredFixed(position.x, position.y, targetPosition.x, targetPosition.y) <= rangeFixed * rangeFixed

    if (inRange) {
      // Stand and fire; do not walk into melee range.
      clearMovement(state, id)
      if (cooldownRemaining === 0) {
        const damage = effectiveDamage(state, id)
        const armor = effectiveArmor(state, targetId)
        accumulateDamage(state, targetId, id, Math.max(1, damage - armor))
        combats.set(id, { ...combat, cooldownRemaining: combat.cooldownTicks })
      }
    } else if (front.type === 'ATTACK') {
      // Out of range and directly ordered: chase the target.
      setMovementDestination(state, id, targetPosition.x, targetPosition.y)
    }
  }
}
