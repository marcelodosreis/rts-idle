import { createSpatialIndex, type SpatialBounds, type SpatialIndexEntry } from '@rts/pathfinding'
import { describe, expect, it } from 'vitest'

const entries: readonly SpatialIndexEntry[] = [
  { id: 7, bounds: { minX: 0, minY: 0, maxX: 12, maxY: 12 } },
  { id: 2, bounds: { minX: 20, minY: 0, maxX: 28, maxY: 8 } },
  { id: 5, bounds: { minX: 8, minY: 8, maxX: 20, maxY: 20 } }
]

function exhaustiveQuery(input: SpatialBounds): readonly number[] {
  return entries
    .filter(
      (entry) =>
        entry.bounds.minX <= input.maxX &&
        entry.bounds.maxX >= input.minX &&
        entry.bounds.minY <= input.maxY &&
        entry.bounds.maxY >= input.minY
    )
    .map((entry) => entry.id)
    .sort((left, right) => left - right)
}

describe('deterministic spatial index', () => {
  it('matches an exhaustive intersection query and sorts IDs', () => {
    const index = createSpatialIndex({ cellSize: 8, entries: [...entries].reverse() })

    const query = { minX: 6, minY: 6, maxX: 22, maxY: 22 }
    expect(index.query(query)).toEqual(exhaustiveQuery(query))
    expect(index.query(query)).toEqual([2, 5, 7])
  })

  it('does not leak input or result mutability', () => {
    const input = { minX: 0, minY: 0, maxX: 4, maxY: 4 }
    const index = createSpatialIndex({ cellSize: 4, entries: [{ id: 1, bounds: input }] })
    input.maxX = 100
    const result = index.query({ minX: 0, minY: 0, maxX: 4, maxY: 4 })

    expect(result).toEqual([1])
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('requires valid cells, bounds, and unique IDs', () => {
    expect(() => createSpatialIndex({ cellSize: 0, entries: [] })).toThrow()
    expect(() =>
      createSpatialIndex({ cellSize: 4, entries: [{ id: 1, bounds: { minX: 2, minY: 0, maxX: 1, maxY: 1 } }] })
    ).toThrow()
    expect(() =>
      createSpatialIndex({
        cellSize: 4,
        entries: [
          { id: 1, bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 } },
          { id: 1, bounds: { minX: 2, minY: 2, maxX: 3, maxY: 3 } }
        ]
      })
    ).toThrow()
  })
})
