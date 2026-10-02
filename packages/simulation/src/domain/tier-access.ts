import type { CastleTier, PlayerId } from '@rts/shared'
import { Building } from '../ecs/building-component.js'
import { Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

/** Returns whether a player currently owns a completed Castle at the requested tier. */
export function hasCurrentCastleTier(state: GameState, ownerId: PlayerId, minimumTier: CastleTier): boolean {
  const buildings = state.world.store(Building)
  const owners = state.world.store(Owner)
  return state.world.query(Building, Owner).some((id) => {
    const building = buildings.get(id)
    return (
      building?.buildingType === 'CASTLE' &&
      building.status === 'COMPLETED' &&
      (building.tier ?? 1) >= minimumTier &&
      owners.get(id)?.owner === ownerId
    )
  })
}
