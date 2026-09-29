import {
  BUILDING_DEFINITIONS,
  competitiveBaseLocations,
  competitiveMineralLocation,
  createCompetitiveMap,
  tileAtPosition
} from '@rts/game-data'
import { BUILDING_GEOMETRY, fixedToRenderPixels } from '@rts/shared'
import { describe, expect, it } from 'vitest'

describe('competitive map', () => {
  const map = createCompetitiveMap()

  it('is 32×32 tiles', () => {
    expect(map.width).toBe(32)
    expect(map.height).toBe(32)
    expect(map.tiles).toHaveLength(32 * 32)
  })

  it('is symmetric by 180° rotation', () => {
    const size = map.width
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        expect(map.tiles[y * size + x]).toBe(map.tiles[(size - 1 - y) * size + (size - 1 - x)])
      }
    }
  })

  it('has a wide all-water border framing the map', () => {
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 32; x += 1) {
        expect(tileAtPosition(map, x, y), `row ${y}`).toBe('water')
        expect(tileAtPosition(map, x, 31 - y), `row ${31 - y}`).toBe('water')
      }
    }
    for (let x = 0; x < 4; x += 1) {
      for (let y = 0; y < 32; y += 1) {
        expect(tileAtPosition(map, x, y), `col ${x}`).toBe('water')
        expect(tileAtPosition(map, 31 - x, y), `col ${31 - x}`).toBe('water')
      }
    }
  })

  it('contains only the central water channel inside the playable land', () => {
    expect(tileAtPosition(map, 15, 15)).toBe('water')
    expect(tileAtPosition(map, 13, 10)).toBe('land')
    expect(tileAtPosition(map, 18, 21)).toBe('land')
  })

  it('keeps the spawn areas on land', () => {
    expect(tileAtPosition(map, 8, 8)).toBe('land')
    expect(tileAtPosition(map, 21, 22)).toBe('land')
  })

  it('places base origins as footprint-aware opposite corners', () => {
    const [northwest, southeast] = competitiveBaseLocations()
    const footprint = BUILDING_DEFINITIONS.CASTLE.footprint

    expect(northwest).toEqual({ x: 6, y: 6 })
    expect(southeast).toEqual({ x: 21, y: 22 })
    expect(southeast).toEqual({
      x: map.width - footprint.width - northwest.x,
      y: map.height - footprint.height - northwest.y
    })
  })

  it('keeps every base footprint on buildable terrain', () => {
    for (const origin of competitiveBaseLocations()) {
      for (let y = origin.y; y < origin.y + BUILDING_DEFINITIONS.CASTLE.footprint.height; y += 1) {
        for (let x = origin.x; x < origin.x + BUILDING_DEFINITIONS.CASTLE.footprint.width; x += 1) {
          expect(tileAtPosition(map, x, y), `base tile ${x},${y}`).toBe('land')
        }
      }
    }
  })

  it('places the mineral node right of the channel at equal distance from both base centers', () => {
    const [first, second] = competitiveBaseLocations()
    const mineral = competitiveMineralLocation()
    const footprint = BUILDING_DEFINITIONS.CASTLE.footprint
    const firstCenter = { x: first.x + footprint.width / 2, y: first.y + footprint.height / 2 }
    const secondCenter = { x: second.x + footprint.width / 2, y: second.y + footprint.height / 2 }
    const firstDistance = (mineral.x - firstCenter.x) ** 2 + (mineral.y - firstCenter.y) ** 2
    const secondDistance = (mineral.x - secondCenter.x) ** 2 + (mineral.y - secondCenter.y) ** 2

    expect(mineral).toEqual({ x: 24, y: 8.5 })
    expect(mineral.x).toBeGreaterThan(23)
    expect(tileAtPosition(map, Math.floor(mineral.x), Math.floor(mineral.y))).toBe('land')
    expect(firstDistance).toBeCloseTo(secondDistance)
  })

  it('uses tile-aligned visual canvases for every building footprint', () => {
    for (const type of ['CASTLE', 'BARRACKS', 'HOUSE'] as const) {
      const geometry = BUILDING_GEOMETRY[type]
      expect(fixedToRenderPixels(geometry.visualSize.width)).toBe(geometry.footprint.width * 64)
      expect(fixedToRenderPixels(geometry.visualSize.height)).toBe(geometry.footprint.height * 64)
    }
  })

  it('does not declare elevation ramps after removing high terrain', () => {
    expect(map.stairs).toBeUndefined()
  })

  it('carries a palette and decoration seed for deterministic dressing', () => {
    expect(map.palette).toBe('color1')
    expect(map.decorationSeed).toBe(1)
  })

  it('rejects out-of-bounds lookups', () => {
    expect(tileAtPosition(map, -1, 0)).toBeNull()
    expect(tileAtPosition(map, 0, 32)).toBeNull()
  })
})
