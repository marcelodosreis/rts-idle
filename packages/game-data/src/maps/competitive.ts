import type { MapDefinition, MapPosition, MapTileKind, StairEntry } from './types.js'

const LAND: MapTileKind = 'land'
const WATER: MapTileKind = 'water'
const ELEVATED: MapTileKind = 'elevated'

/** Mirror a 2D coordinate by 180° rotation for map symmetry (master plan §14.3). */
function mirrored(x: number, y: number, size: number): MapPosition {
  return { x: size - 1 - x, y: size - 1 - y }
}

function inRect(x: number, y: number, x0: number, y0: number, x1: number, y1: number): boolean {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1
}

const STAIR_LEFT: StairEntry = { x: 13, y: 12, direction: 'left' }
const STAIR_RIGHT: StairEntry = { x: 18, y: 23, direction: 'right' }

/**
 * Baseline competitive map: 32×32 tiles, symmetric by 180° rotation. A wide
 * all-water frame (4 tiles) surrounds the playable interior so the map floats
 * on open water. The interior holds a central contestable water channel and an
 * elevated plateau near each base reached by a stair ramp. Terrain is
 * presentation only today; gameplay terrain/pathfinding arrives in Phase 3.
 */
export function createCompetitiveMap(): MapDefinition {
  const size = 32
  const border = 4
  const plateauA: MapPosition = { x: 13, y: 10 }
  const plateauB = mirrored(plateauA.x, plateauA.y, size)
  const tiles: MapTileKind[] = Array.from({ length: size * size }, () => LAND)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x

      const onBorder = x < border || x >= size - border || y < border || y >= size - border
      const centralChannel = inRect(x, y, 14, 14, 17, 17)
      const plateau = inRect(x, y, plateauA.x - 1, plateauA.y - 1, plateauA.x + 1, plateauA.y + 1)
      const plateauBRegion = inRect(x, y, plateauB.x - 1, plateauB.y - 1, plateauB.x + 1, plateauB.y + 1)

      if (onBorder) {
        tiles[index] = WATER
      } else if (centralChannel) {
        tiles[index] = WATER
      } else if (plateau || plateauBRegion) {
        tiles[index] = ELEVATED
      }
    }
  }

  return {
    width: size,
    height: size,
    tiles,
    stairs: [STAIR_LEFT, STAIR_RIGHT],
    palette: 'color1',
    decorationSeed: 1
  }
}
