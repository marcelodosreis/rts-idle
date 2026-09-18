import { Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

/**
 * Maximum ticks before a running match is cut off as a draw (Phase 1 default;
 * real match timers land with balance/content). 5000 ticks at 20/s is ~4 min.
 */
export const TICK_LIMIT = 5000

/**
 * Victory step (master plan P1.07): resolves match end conditions after the
 * combat and death steps. The match finishes when a single player still has
 * living units (win), nobody has living units (draw), or the tick limit is
 * reached. Losers are marked defeated only at the finish; the phase is a
 * deterministic flag and does not freeze the tick (the server stops advancing
 * commands on its own).
 */
export function victorySystem(state: GameState): void {
  if (state.phase !== 'RUNNING') {
    return
  }
  const owners = state.world.store(Owner)
  const aliveOwners = new Set<number>()
  for (const id of state.world.aliveIds()) {
    const owner = owners.get(id)?.owner
    if (owner !== undefined) {
      aliveOwners.add(owner)
    }
  }
  const living = state.players.filter((player) => aliveOwners.has(player.id))
  if (state.tick >= TICK_LIMIT || living.length <= 1) {
    state.phase = 'FINISHED'
    const winnerId = living.length === 1 ? living[0]!.id : undefined
    for (const player of state.players) {
      if (!aliveOwners.has(player.id) && player.id !== winnerId) {
        player.defeated = true
      }
    }
  }
}
