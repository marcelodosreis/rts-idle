import { Building } from '../ecs/building-component.js'
import { Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

export function tierSystem(state: GameState): void {
  const buildings = state.world.store(Building)
  const owners = state.world.store(Owner)
  for (const id of state.world.aliveIds()) {
    const building = buildings.get(id)
    const ownerId = owners.get(id)?.owner
    const upgrade = building?.tierUpgrade
    if (building?.buildingType !== 'CASTLE' || ownerId === undefined || upgrade === undefined || upgrade === null) {
      continue
    }
    const progressTicks = upgrade.progressTicks + 1
    if (progressTicks < upgrade.totalTicks) {
      buildings.set(id, { ...building, tierUpgrade: { ...upgrade, progressTicks } })
      continue
    }
    buildings.set(id, { ...building, tier: 2, tierUpgrade: null })
    const player = state.players.find((candidate) => candidate.id === ownerId)
    if (player !== undefined) {
      player.highestCastleTierReached = Math.max(player.highestCastleTierReached, 2) as 1 | 2 | 3
    }
  }
}
