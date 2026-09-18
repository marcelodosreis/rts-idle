import { Combat, Health, Owner, Position } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

/** Raised when a central invariant no longer holds (master plan P1.08). */
export class InvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvariantError'
  }
}

function fail(invariant: string): never {
  throw new InvariantError(`check-invariants: ${invariant}`)
}

/**
 * Central-invariant step (master plan P1.08): validates that a tick preserved
 * the state's core properties. Runs last in the pipeline and never mutates
 * state; a violation means a system produced an illegal state.
 */
export function checkInvariants(state: GameState): void {
  const positions = state.world.store(Position)
  const owners = state.world.store(Owner)
  const healths = state.world.store(Health)
  const combats = state.world.store(Combat)

  for (const id of state.world.aliveIds()) {
    if (positions.get(id) === undefined) {
      fail(`entity ${id} has no position`)
    }
    const health = healths.get(id)
    if (health !== undefined) {
      if (health.max <= 0 || health.current < 0 || health.current > health.max) {
        fail(`entity ${id} has invalid health ${health.current}/${health.max}`)
      }
    }
    const combat = combats.get(id)
    if (combat !== undefined) {
      if (combat.damage < 0 || combat.rangeTiles < 0 || combat.cooldownTicks < 0) {
        fail(`entity ${id} has negative combat stats`)
      }
      if (combat.cooldownRemaining < 0 || combat.cooldownRemaining > combat.cooldownTicks) {
        fail(`entity ${id} has cooldown ${combat.cooldownRemaining} outside [0, ${combat.cooldownTicks}]`)
      }
      if (healths.get(id) === undefined) {
        fail(`entity ${id} can fight without health`)
      }
    }
  }

  const playerIds = state.players.map((player) => player.id)
  if (state.players.length !== 4 || new Set(playerIds).size !== 4) {
    fail('player slots are not exactly the four competitive ids')
  }

  const aliveOwners = new Set<number>()
  for (const id of state.world.aliveIds()) {
    const owner = owners.get(id)?.owner
    if (owner !== undefined) {
      aliveOwners.add(owner)
    }
  }
  for (const player of state.players) {
    if (player.defeated && aliveOwners.has(player.id)) {
      fail(`defeated player ${player.id} still has living units`)
    }
  }

  if (state.pendingDamage.size !== 0) {
    fail('the per-tick damage buffer was not cleared')
  }
}
