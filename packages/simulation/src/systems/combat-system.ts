import { distSquaredFixed } from '@rts/shared'
import { Attack, Health, OrderQueue, Owner, Position, UnitClass } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import type { SystemContext } from './pipeline.js'

/**
 * Combat damage application (master plan §12.1):
 * `modifiedDamage = floor(baseDamage * modifierBP / 10_000)` (BP baseline
 * 10_000 = 100%), `effectiveDamage = max(1, modifiedDamage - effectiveArmor)`.
 * No negative damage; HP is clamped to zero.
 */
export function computeDamage(baseDamage: number, armor: number): number {
  const modifiedDamage = Math.floor((baseDamage * 10_000) / 10_000)
  return Math.max(1, modifiedDamage - armor)
}

interface TargetCandidate {
  readonly id: number
  readonly priority: number
  readonly distanceSquared: number
}

function bestTarget(a: TargetCandidate, b: TargetCandidate): boolean {
  if (a.priority !== b.priority) {
    return a.priority < b.priority
  }
  if (a.distanceSquared !== b.distanceSquared) {
    return a.distanceSquared < b.distanceSquared
  }
  return a.id < b.id
}

/**
 * Target acquisition priority (master plan §12.2): combatant → worker →
 * building, tie-broken by squared distance then entity id. Interim full scan;
 * the spatial index replaces it in Phase 3 (P3.05).
 */
function acquireTarget(state: GameState, attackerId: number, rangeSquared: number): number | undefined {
  const positions = state.world.store(Position)
  const owners = state.world.store(Owner)
  const classes = state.world.store(UnitClass)
  const healths = state.world.store(Health)
  const attacker = positions.get(attackerId)
  const attackerOwner = owners.get(attackerId)
  if (attacker === undefined || attackerOwner === undefined) {
    return undefined
  }
  let best: TargetCandidate | undefined
  for (const candidateId of state.world.aliveIds()) {
    if (candidateId === attackerId) {
      continue
    }
    const owner = owners.get(candidateId)
    const position = positions.get(candidateId)
    const health = healths.get(candidateId)
    if (owner === undefined || position === undefined || health === undefined) {
      continue
    }
    if (owner.owner === attackerOwner.owner || health.current <= 0) {
      continue
    }
    const distanceSquared = distSquaredFixed(attacker.x, attacker.y, position.x, position.y)
    if (distanceSquared > rangeSquared) {
      continue
    }
    const kind = classes.get(candidateId)?.kind
    let priority: number
    if (kind === 'military') {
      priority = 0
    } else if (kind === 'worker') {
      priority = 1
    } else {
      priority = 2
    }
    const candidate: TargetCandidate = { id: candidateId, priority, distanceSquared }
    if (best === undefined || bestTarget(candidate, best)) {
      best = candidate
    }
  }
  return best?.id
}

/** Whether the head order allows automatic attacks in range (§12.3). */
function autoAttacks(headOrder: { readonly type: string } | undefined): boolean {
  if (headOrder === undefined) {
    return true
  }
  return headOrder.type === 'HOLD' || headOrder.type === 'ATTACK_MOVE' || headOrder.type === 'STOP'
}

function resolveTarget(
  state: GameState,
  attackerId: number,
  order: { readonly type: string; readonly targetId?: number } | undefined,
  rangeSquared: number
): number | undefined {
  if (order?.type === 'ATTACK') {
    return order.targetId
  }
  if (autoAttacks(order)) {
    return acquireTarget(state, attackerId, rangeSquared)
  }
  return undefined
}

/**
 * System-order step 11: select attacks and create damage events. An explicit
 * ATTACK order fires at its target; otherwise units auto-acquire an enemy in
 * range when their order permits (idle, HOLD, ATTACK_MOVE). The cooldown starts
 * when the attack is issued (§12.1).
 */
export function combatSystem(state: GameState, context: SystemContext): void {
  const attacks = state.world.store(Attack)
  const healths = state.world.store(Health)
  const positions = state.world.store(Position)
  const queues = state.world.store(OrderQueue)

  for (const attackerId of state.world.aliveIds()) {
    const attack = attacks.get(attackerId)
    if (attack === undefined) {
      continue
    }
    const health = healths.get(attackerId)
    const position = positions.get(attackerId)
    if (health === undefined || position === undefined) {
      continue
    }
    const order = queues.get(attackerId)?.orders[0]

    if (attack.cooldownRemaining > 0) {
      attacks.set(attackerId, { ...attack, cooldownRemaining: attack.cooldownRemaining - 1 })
      continue
    }

    const targetId = resolveTarget(state, attackerId, order, attack.range * attack.range)
    if (targetId === undefined) {
      continue
    }

    const targetHealth = healths.get(targetId)
    const targetPosition = positions.get(targetId)
    if (targetHealth === undefined || targetPosition === undefined) {
      continue
    }
    const rangeSquared = attack.range * attack.range
    if (distSquaredFixed(position.x, position.y, targetPosition.x, targetPosition.y) > rangeSquared) {
      continue
    }

    const damage = computeDamage(attack.damage, targetHealth.armor)
    healths.set(targetId, { ...targetHealth, current: Math.max(0, targetHealth.current - damage) })

    attacks.set(attackerId, { ...attack, cooldownRemaining: attack.cooldownTicks })
    context.events.push({
      type: 'attackFired',
      attackerId,
      targetId,
      x: position.x,
      y: position.y
    })
    context.events.push({
      type: 'damageDealt',
      targetId,
      amount: damage,
      x: targetPosition.x,
      y: targetPosition.y
    })
  }
}
