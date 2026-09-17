import type { PlayerId } from '@rts/shared'
import { Movement, OrderQueue, Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

/**
 * Marks a player defeated and deactivates their remaining entities: orders and
 * movement are cleared so they neither receive nor carry out new instructions
 * and do not keep the match alive (master plan §11.6).
 *
 * The players array is replaced with a new copy (readonly boundary); the
 * simulation core is the single authorized writer (AGENTS.md / ADR-001).
 */
export function defeatPlayerSystem(state: GameState, playerId: PlayerId): void {
  const nextPlayers = state.players.map((player, index) =>
    index === playerId ? { ...player, defeated: true } : player
  )
  ;(state as { players: typeof state.players }).players = nextPlayers

  const owners = state.world.store(Owner)
  const queues = state.world.store(OrderQueue)
  const movements = state.world.store(Movement)
  for (const id of state.world.aliveIds()) {
    const owner = owners.get(id)
    if (owner !== undefined && owner.owner === playerId) {
      queues.delete(id)
      movements.delete(id)
    }
  }
}
