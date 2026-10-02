import { MONK_HEAL_AMOUNT, MONK_HEAL_COOLDOWN_TICKS, MONK_HEAL_RANGE_FIXED, unitDefinitionFor } from '@rts/game-data'
import { distSquaredFixed } from '@rts/shared'
import { AbilityCooldown, Health, Kind, Orders, Owner, Position } from '../ecs/components.js'
import { clearMovement, setMovementDestination } from '../movement/destination.js'
import { clearOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'

export function healSystem(state: GameState): void {
  const cooldowns = state.world.store(AbilityCooldown)
  const orders = state.world.store(Orders)
  const positions = state.world.store(Position)
  const healths = state.world.store(Health)
  const owners = state.world.store(Owner)
  const kinds = state.world.store(Kind)

  for (const id of state.world.query(AbilityCooldown)) {
    const cooldown = cooldowns.get(id)
    if (cooldown !== undefined) {
      cooldowns.set(id, { healCooldownRemaining: Math.max(0, cooldown.healCooldownRemaining - 1) })
    }
  }
  for (const id of state.world.query(Orders, Kind)) {
    const order = orders.get(id)?.queue[0]
    const kind = kinds.get(id)
    if (order?.type !== 'HEAL' || kind === undefined || !unitDefinitionFor(kind).canHeal) {
      continue
    }
    const targetPosition = positions.get(order.targetId)
    const position = positions.get(id)
    const targetHealth = healths.get(order.targetId)
    const owner = owners.get(order.targetId)
    const casterOwner = owners.get(id)
    if (
      targetPosition === undefined ||
      position === undefined ||
      targetHealth === undefined ||
      owner === undefined ||
      casterOwner === undefined ||
      owner.owner !== casterOwner.owner ||
      targetHealth.current >= targetHealth.max
    ) {
      clearOrders(state, id)
      clearMovement(state, id)
      continue
    }
    const rangeFixed = MONK_HEAL_RANGE_FIXED
    if (distSquaredFixed(position.x, position.y, targetPosition.x, targetPosition.y) > rangeFixed * rangeFixed) {
      setMovementDestination(state, id, targetPosition.x, targetPosition.y)
      continue
    }
    clearMovement(state, id)
    const amount = Math.min(MONK_HEAL_AMOUNT, targetHealth.max - targetHealth.current)
    const targetHp = targetHealth.current + amount
    healths.set(order.targetId, { ...targetHealth, current: targetHp })
    cooldowns.set(id, { healCooldownRemaining: MONK_HEAL_COOLDOWN_TICKS })
    state.events.push({ type: 'healCast', healerId: id, targetId: order.targetId, amount, targetHp })
    clearOrders(state, id)
  }
}
