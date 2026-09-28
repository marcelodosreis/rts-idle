import type { SnapshotBuilding } from '@rts/protocol'
import { Building, Health, Owner, Position, Production, type World } from '@rts/simulation'

export function projectBuildings(world: World): readonly SnapshotBuilding[] {
  const buildings = world.store(Building)
  const positions = world.store(Position)
  const owners = world.store(Owner)
  const productions = world.store(Production)
  const healths = world.store(Health)
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
      const production = productions.get(id)
      const health = healths.get(id)
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
        totalTicks: building.totalTicks,
        rallyPoint: building.rallyPoint ?? null,
        ...(health === undefined ? {} : { hp: health.current, maxHp: health.max }),
        ...(production === undefined ? {} : { production: { queue: production.queue.map((item) => ({ ...item })) } })
      }
    })
}
