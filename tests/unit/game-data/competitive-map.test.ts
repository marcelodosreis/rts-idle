import { createCompetitiveMap, tileAtPosition } from '@rts/game-data'
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

  it('contains a central water channel and elevated plateaus', () => {
    expect(tileAtPosition(map, 15, 15)).toBe('water')
    expect(tileAtPosition(map, 13, 10)).toBe('elevated')
    expect(tileAtPosition(map, 18, 21)).toBe('elevated')
  })

  it('keeps the spawn areas on land', () => {
    expect(tileAtPosition(map, 8, 8)).toBe('land')
    expect(tileAtPosition(map, 23, 23)).toBe('land')
  })

  it('declares a stair ramp on the south edge of each plateau', () => {
    expect(map.stairs).toHaveLength(2)
    expect(map.stairs![0]).toEqual({ x: 13, y: 12, direction: 'left' })
    expect(map.stairs![1]).toEqual({ x: 18, y: 23, direction: 'right' })
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
