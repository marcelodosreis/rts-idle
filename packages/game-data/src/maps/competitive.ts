import type { MapDefinition, MapPosition, MapTileKind } from './types.js'

const GRASS: MapTileKind = 'grass'
const WATER: MapTileKind = 'water'
const ROCK: MapTileKind = 'rock'

/** Mirror a 2D coordinate by 180° rotation for map symmetry (master plan §14.3). */
function mirrored(x: number, y: number, size: number): MapPosition {
  return { x: size - 1 - x, y: size - 1 - y }
}

function inCircle(x: number, y: number, center: MapPosition, radiusSquared: number): boolean {
  const dx = x - center.x
  const dy = y - center.y
  return dx * dx + dy * dy <= radiusSquared
}

/**
 * Baseline competitive map: 192×192 tiles, symmetric by 180° rotation. Two
 * water ponds around the bases and a central water band (contestable), with
 * rock patches near the expansion points. Purely decorative today; gameplay
 * terrain/pathfinding arrives in Phase 3.
 */
export function createCompetitiveMap(): MapDefinition {
  const size = 192
  const baseA: MapPosition = { x: 24, y: 96 }
  const expansionA: MapPosition = { x: 40, y: 40 }
  const baseB = mirrored(baseA.x, baseA.y, size)
  const expansionB = mirrored(expansionA.x, expansionA.y, size)
  const tiles: MapTileKind[] = Array.from({ length: size * size }, () => GRASS)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x

      const nearWater = inCircle(x, y, baseA, 42) || inCircle(x, y, baseB, 42)
      const centralBand = x >= 72 && x <= 119 && (y < 76 || y > 115)
      const nearExpansion = inCircle(x, y, expansionA, 20) || inCircle(x, y, expansionB, 20)

      if (nearWater) {
        tiles[index] = WATER
      } else if (centralBand) {
        tiles[index] = WATER
      } else if (nearExpansion && (x - y) % 7 === 0) {
        tiles[index] = ROCK
      }
    }
  }

  return { width: size, height: size, tiles }
}
