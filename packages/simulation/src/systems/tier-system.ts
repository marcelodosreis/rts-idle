import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { advanceTimedProgress } from '@rts/shared'
import { Building } from '../ecs/building-component.js'
import { Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

export function tierSystem(state: GameState): void {
  const buildings = state.world.store(Building)
  const owners = state.world.store(Owner)
  for (const id of state.world.query(Building, Owner)) {
    const building = buildings.get(id)
    const ownerId = owners.get(id)?.owner
    const upgrade = building?.tierUpgrade
    if (
      building === undefined ||
      !BUILDING_DEFINITIONS[building.buildingType].capabilities.canUpgrade ||
      ownerId === undefined ||
      upgrade === undefined ||
      upgrade === null
    ) {
      continue
    }
    const progress = advanceTimedProgress(upgrade)
    if (!progress.completed) {
      buildings.set(id, { ...building, tierUpgrade: { ...upgrade, progressTicks: progress.progressTicks } })
      continue
    }
    buildings.set(id, { ...building, tier: 2, tierUpgrade: null })
  }
}
