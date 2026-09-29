import type { GameState } from '../state/state.js'
import { isResearchProductionItem, Owner, Production } from './components.js'

/** Removes an entity while releasing authoritative production reservations. */
export function removeEntity(state: GameState, entityId: number): void {
  const queue = state.world.store(Production).get(entityId)?.queue
  if (queue !== undefined && queue.length > 0) {
    const ownerId = state.world.store(Owner).get(entityId)?.owner
    const player = state.players.find((candidate) => candidate.id === ownerId)
    if (player === undefined) {
      throw new Error(`removeEntity: producer ${entityId} has no owner`)
    }
    player.reservedSupply -= queue.reduce(
      (total, item) => total + (isResearchProductionItem(item) ? 0 : item.reservedSupply),
      0
    )
  }
  state.world.removeEntity(entityId)
}
