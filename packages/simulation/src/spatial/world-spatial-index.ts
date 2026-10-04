import { createSpatialIndex, type SpatialIndex } from '@rts/pathfinding'
import { type EntityId, FIXED_SCALE } from '@rts/shared'
import { Building, type BuildingData } from '../ecs/building-component.js'
import { Kind, Position } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

export const UNIT_COLLISION_RADIUS_FIXED = 64
const SPATIAL_CELL_SIZE_FIXED = FIXED_SCALE

export interface WorldSpatialIndex {
  readonly units: SpatialIndex<EntityId>
  readonly buildings: SpatialIndex<EntityId>
}

function unitBounds(
  x: number,
  y: number
): { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } {
  return {
    minX: x - UNIT_COLLISION_RADIUS_FIXED,
    minY: y - UNIT_COLLISION_RADIUS_FIXED,
    maxX: x + UNIT_COLLISION_RADIUS_FIXED,
    maxY: y + UNIT_COLLISION_RADIUS_FIXED
  }
}

function buildingBounds(building: BuildingData): {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
} {
  return {
    minX: building.footprint.x * FIXED_SCALE,
    minY: building.footprint.y * FIXED_SCALE,
    maxX: (building.footprint.x + building.footprint.width) * FIXED_SCALE,
    maxY: (building.footprint.y + building.footprint.height) * FIXED_SCALE
  }
}

export function createWorldSpatialIndex(state: Pick<GameState, 'world'>): WorldSpatialIndex {
  const positions = state.world.store(Position)
  const units = state.world.query(Kind, Position).map((id) => ({
    id,
    bounds: unitBounds(positions.get(id)!.x, positions.get(id)!.y)
  }))
  const buildings = state.world.store(Building)
  const buildingEntries = state.world.query(Building).map((id) => {
    const entry = buildings.get(id)
    if (entry === undefined) {
      throw new Error(`spatial index: building ${id} disappeared`)
    }
    return { id, bounds: buildingBounds(entry) }
  })
  return Object.freeze({
    units: createSpatialIndex({ cellSize: SPATIAL_CELL_SIZE_FIXED, entries: units }),
    buildings: createSpatialIndex({ cellSize: SPATIAL_CELL_SIZE_FIXED, entries: buildingEntries })
  })
}
