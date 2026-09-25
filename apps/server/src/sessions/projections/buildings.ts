import type { SnapshotBuilding } from '@rts/protocol'
import { Building, Owner, Position, type World } from '@rts/simulation'

export function projectBuildings(world: World): readonly SnapshotBuilding[] {
  const buildings = world.store(Building)
  const positions = world.store(Position)
  const owners = world.store(Owner)
  return world
    .aliveIds()
    .filter((id) => buildings.has(id))
    .map((id) => {
      const position = positions.get(id)
      const owner = owners.get(id)
      const building = buildings.get(id)
      if (position === undefined || owner === undefined || building === undefined) {
        throw new Error(`GameSession: building ${id} is missing projection data`)
      }
      return {
        id,
        buildingType: building.buildingType,
        x: position.x,
        y: position.y,
        owner: owner.owner,
        builderId: building.builderId,
        footprint: { width: building.footprint.width, height: building.footprint.height },
        status: building.status,
        progressTicks: building.progressTicks,
        totalTicks: building.totalTicks
      }
    })
}
