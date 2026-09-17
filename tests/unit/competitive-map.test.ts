import { createCompetitiveMap, tileAtPosition } from '@rts/game-data'
import { describe, expect, it } from 'vitest'

describe('competitive map', () => {
  const map = createCompetitiveMap()

  it('is 192×192 tiles', () => {
    expect(map.width).toBe(192)
    expect(map.height).toBe(192)
    expect(map.tiles).toHaveLength(192 * 192)
  })

  it('is symmetric by 180° rotation', () => {
    const size = map.width
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        expect(map.tiles[y * size + x]).toBe(map.tiles[(size - 1 - y) * size + (size - 1 - x)])
      }
    }
  })

  it('contains water near the base and rock near the expansion', () => {
    expect(tileAtPosition(map, 24, 96)).toBe('water')
    expect(tileAtPosition(map, 41, 41)).toBe('rock')
    expect(tileAtPosition(map, 100, 100)).toBe('grass')
  })

  it('rejects out-of-bounds lookups', () => {
    expect(tileAtPosition(map, -1, 0)).toBeNull()
    expect(tileAtPosition(map, 0, 192)).toBeNull()
  })
})
