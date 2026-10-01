import type { ResourceDefinition } from '@rts/shared'
import { tilesToFixed } from '@rts/shared'
import { BUILDING_FOOTPRINTS } from '../building-footprints.js'
import type { MapDefinition, MapPosition, MapTileKind } from './types.js'

const LAND: MapTileKind = 'land'
const WATER: MapTileKind = 'water'
const COMPETITIVE_MAP_SIZE = 32
const BASE_ORIGIN: MapPosition = { x: 6, y: 6 }
const LOWER_LEFT_TREE_ORIGIN: MapPosition = { x: 5, y: 23 }
const LOWER_LEFT_TREE_COLUMNS = 8
const LOWER_LEFT_TREE_ROWS = 5

interface Rect {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

function inRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function competitiveResources(): MapDefinition['resources'] {
  const resources: ResourceDefinition[] = Array.from(
    { length: LOWER_LEFT_TREE_COLUMNS * LOWER_LEFT_TREE_ROWS },
    (_, index) => {
      const x = LOWER_LEFT_TREE_ORIGIN.x + (index % LOWER_LEFT_TREE_COLUMNS)
      const y = LOWER_LEFT_TREE_ORIGIN.y + Math.floor(index / LOWER_LEFT_TREE_COLUMNS)
      return {
        resourceId: index + 1,
        kind: 'TREE' as const,
        x: tilesToFixed(x),
        y: tilesToFixed(y),
        variant: index % 2,
        initialAmount: 30,
        harvestAmount: 10,
        harvestTicks: 200,
        blocksNavigation: false
      }
    }
  )
  const goldMine = competitiveGoldMineLocation()
  resources.push({
    resourceId: LOWER_LEFT_TREE_COLUMNS * LOWER_LEFT_TREE_ROWS + 1,
    kind: 'GOLD_MINE' as const,
    x: tilesToFixed(goldMine.x),
    y: tilesToFixed(goldMine.y),
    variant: 0,
    initialAmount: 3_000,
    harvestAmount: 10,
    harvestTicks: 200,
    blocksNavigation: false
  })
  return resources
}

/** Returns footprint-aware base origins for the two opposite starting sides. */
export function competitiveBaseLocations(): readonly [MapPosition, MapPosition] {
  const footprint = BUILDING_FOOTPRINTS.CASTLE
  return [
    BASE_ORIGIN,
    {
      x: COMPETITIVE_MAP_SIZE - footprint.width - BASE_ORIGIN.x,
      y: COMPETITIVE_MAP_SIZE - footprint.height - BASE_ORIGIN.y
    }
  ]
}

/** Returns a land position on the perpendicular bisector of both base centers. */
export function competitiveGoldMineLocation(): MapPosition {
  const [first, second] = competitiveBaseLocations()
  const footprint = BUILDING_FOOTPRINTS.CASTLE
  const firstCenter = { x: first.x + footprint.width / 2, y: first.y + footprint.height / 2 }
  const secondCenter = { x: second.x + footprint.width / 2, y: second.y + footprint.height / 2 }
  const midpoint = {
    x: (firstCenter.x + secondCenter.x) / 2,
    y: (firstCenter.y + secondCenter.y) / 2
  }
  const x = 24
  return {
    x,
    y: midpoint.y - ((secondCenter.x - firstCenter.x) / (secondCenter.y - firstCenter.y)) * (x - midpoint.x)
  }
}

/**
 * Baseline competitive map: 32×32 tiles, symmetric by 180° rotation. A wide
 * all-water frame (4 tiles) surrounds the playable interior so the map floats
 * on open water. The interior holds a central contestable water channel.
 * Terrain is presentation only today; gameplay terrain/pathfinding arrives in
 * Phase 3.
 */
export function createCompetitiveMap(): MapDefinition {
  const size = COMPETITIVE_MAP_SIZE
  const border = 4
  const tiles: MapTileKind[] = Array.from({ length: size * size }, () => LAND)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x

      const onBorder = x < border || x >= size - border || y < border || y >= size - border
      const centralChannel = inRect(x, y, { left: 14, top: 14, right: 17, bottom: 17 })
      if (onBorder) {
        tiles[index] = WATER
      } else if (centralChannel) {
        tiles[index] = WATER
      }
    }
  }

  return {
    width: size,
    height: size,
    tiles,
    palette: 'color1',
    decorationSeed: 1,
    resources: competitiveResources()
  }
}
