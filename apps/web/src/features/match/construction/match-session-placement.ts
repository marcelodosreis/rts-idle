import type { BuildCatalogEntry, SnapshotMessage } from '@rts/protocol'
import {
  FIXED_SCALE,
  type MapDefinition,
  placementBoundsFromMap,
  renderPixelsToFixed,
  tilesToFixed,
  validateBuildingPlacement
} from '@rts/shared'
import { buildingTypeForMode, type CommandMode } from '../commands/useCommandModes'

export interface MatchPlacement {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly valid: boolean
  readonly reason: string | null
}

const PLACEMENT_REASONS = {
  OUT_OF_BOUNDS: 'Outside the map.',
  INVALID_TILE: 'This terrain cannot support construction.',
  OVERLAP: 'Location is occupied.',
  INVALID_FOOTPRINT: 'This terrain cannot support construction.'
} as const

export interface PlacementQuery {
  readonly mode: CommandMode
  readonly map: MapDefinition | null
  readonly buildCatalog: readonly BuildCatalogEntry[]
  readonly buildings: SnapshotMessage['buildings']
  readonly worldX: number
  readonly worldY: number
}

export function placementFor(query: PlacementQuery): MatchPlacement | null {
  const { mode, map, buildCatalog, buildings, worldX, worldY } = query
  const buildingType = buildingTypeForMode(mode)
  if (buildingType === null || map === null) {
    return null
  }
  const definition = buildCatalog.find((candidate) => candidate.type === buildingType)
  if (definition === undefined) {
    return null
  }
  const { width, height } = definition.footprint
  const x = Math.floor(renderPixelsToFixed(worldX) / FIXED_SCALE)
  const y = Math.floor(renderPixelsToFixed(worldY) / FIXED_SCALE)
  const result = validateBuildingPlacement(
    placementBoundsFromMap(map),
    buildings.map((building) => ({ x: building.x / FIXED_SCALE, y: building.y / FIXED_SCALE, ...building.footprint })),
    { x, y, width, height }
  )
  return {
    x: tilesToFixed(x),
    y: tilesToFixed(y),
    width,
    height,
    valid: result.ok,
    reason: result.ok ? null : PLACEMENT_REASONS[result.reason]
  }
}
