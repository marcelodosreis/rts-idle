import { distSquaredFixed } from '@rts/shared'
import { Attack, Health, OrderQueue, Owner, Position } from '../ecs/components.js'
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

function isEnemyOf(state: GameState, attackerId: number, targetId: number): boolean {
  const owners = state.world.store(Owner)
  const attacker = owners.get(attackerId)
  const target = owners.get(targetId)
  return attacker !== undefined && target !== undefined && attacker.owner !== target.owner
}

/**
 * System-order step 11: select attacks and create damage events. Units with an
 * ATTACK order fire at their explicit target when it is in range and the
 * cooldown is ready; the cooldown starts when the attack is issued (§12.1).
 * Damage is applied immediately (the accumulation buffer and death resolution
 * land in task A11).
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
    const queue = queues.get(attackerId)
    const order = queue?.orders[0]
    if (order === undefined || order.type !== 'ATTACK') {
      continue
    }

    const ready = attack.cooldownRemaining <= 0
    if (!ready) {
      attacks.set(attackerId, { ...attack, cooldownRemaining: attack.cooldownRemaining - 1 })
      continue
    }

    const targetHealth = healths.get(order.targetId)
    const targetPosition = positions.get(order.targetId)
    if (targetHealth === undefined || targetPosition === undefined || !isEnemyOf(state, attackerId, order.targetId)) {
      continue
    }

    const rangeSquared = attack.range * attack.range
    const distanceSquared = distSquaredFixed(position.x, position.y, targetPosition.x, targetPosition.y)
    if (distanceSquared > rangeSquared) {
      continue
    }

    const damage = computeDamage(attack.damage, targetHealth.armor)
    healths.set(order.targetId, { ...targetHealth, current: Math.max(0, targetHealth.current - damage) })

    attacks.set(attackerId, { ...attack, cooldownRemaining: attack.cooldownTicks })
    context.events.push({
      type: 'attackFired',
      attackerId,
      targetId: order.targetId,
      x: position.x,
      y: position.y
    })
    context.events.push({
      type: 'damageDealt',
      targetId: order.targetId,
      amount: damage,
      x: targetPosition.x,
      y: targetPosition.y
    })
  }
}
