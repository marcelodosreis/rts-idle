import { Building } from '../ecs/building-component.js'
import { Health, Orders, Owner } from '../ecs/components.js'
import { removeEntity } from '../ecs/remove-entity.js'
import { clearMovement } from '../movement/destination.js'
import { setOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'

/**
 * Clears every standing ATTACK order that points at the given dead unit, so
 * surviving units resolve their orders in the same tick the target dies
 * (reference cleanup, master plan P1.06).
 */
function clearOrdersTargeting(state: GameState, deadId: number): void {
  const orders = state.world.store(Orders)
  for (const id of state.world.aliveIds()) {
    const queue = orders.get(id)?.queue
    if (queue === undefined || queue.length === 0) {
      continue
    }
    const remaining = queue.filter((order) => !(order.type === 'ATTACK' && order.targetId === deadId))
    if (remaining.length === 0) {
      setOrders(state, id, [])
    } else if (remaining.length !== queue.length) {
      setOrders(state, id, remaining)
    }
  }
}

function clearOrdersForBuilding(state: GameState, buildingId: number): void {
  const orders = state.world.store(Orders)
  for (const id of state.world.aliveIds()) {
    const queue = orders.get(id)?.queue
    if (queue === undefined) {
      continue
    }
    const remaining = queue.filter((order) => !(order.type === 'BUILD' && order.buildingId === buildingId))
    if (remaining.length === queue.length) {
      continue
    }
    setOrders(state, id, remaining)
    clearMovement(state, id)
  }
}

/**
 * Death step 14 (master plan P1.06): applies the per-tick damage buffer to
 * every target simultaneously, then removes the dead. A unit dies when its
 * health reaches zero; removal clears its stores (orders and movement
 * included), and surviving units drop any ATTACK order pointing at the dead
 * target immediately. Emits `damageDealt` and `unitDied`.
 */
export function deathSystem(state: GameState): void {
  const healths = state.world.store(Health)
  const owners = state.world.store(Owner)
  const entries = [...state.pendingDamage.entries()]
  entries.sort((a, b) => a[0] - b[0])
  for (const [targetId, damage] of entries) {
    const health = healths.get(targetId)
    if (health === undefined) {
      continue
    }
    const current = health.current - damage.amount
    healths.set(targetId, { ...health, current })
    state.events.push({ type: 'damageDealt', targetId, amount: damage.amount, targetHp: current })
    if (current <= 0) {
      const owner = owners.get(targetId)?.owner ?? 0
      const isBuilding = state.world.store(Building).has(targetId)
      const isUnit = !isBuilding
      removeEntity(state, targetId)
      clearOrdersTargeting(state, targetId)
      if (isBuilding) {
        clearOrdersForBuilding(state, targetId)
      }
      if (isUnit) {
        state.events.push({ type: 'unitDied', entityId: targetId, owner, killerId: damage.attackerId })
      }
    }
  }
  state.pendingDamage.clear()
}
