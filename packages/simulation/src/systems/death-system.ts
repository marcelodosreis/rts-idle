import { Health, Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

/**
 * Death step 14 (master plan P1.06): applies the per-tick damage buffer to
 * every target simultaneously, then removes the dead. A unit dies when its
 * health reaches zero; removal clears its stores (orders and movement
 * included), and any unit still pointing at the dead target resolves its order
 * next combat step. Emits `damageDealt` and `unitDied`.
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
      state.world.removeEntity(targetId)
      state.events.push({ type: 'unitDied', entityId: targetId, owner, killerId: damage.attackerId })
    }
  }
  state.pendingDamage.clear()
}
