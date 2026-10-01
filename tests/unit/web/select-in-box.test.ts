import { describe, expect, it } from 'vitest'
import type { BoxBuilding, BoxResource } from '../../../apps/web/src/features/match/selection/select-in-box.js'
import { selectInBox } from '../../../apps/web/src/features/match/selection/select-in-box.js'

function building(id: number, x: number, y: number, width = 2, height = 2): BoxBuilding {
  return { id, x, y, width, height }
}

function resource(id: number, x: number, y: number): BoxResource {
  return { id, x, y }
}

describe('selectInBox', () => {
  it('prioritizes units over buildings and resources', () => {
    const result = selectInBox({
      units: new Map([[5, { x: 10, y: 10 }]]),
      buildings: [building(2, 0, 0, 100, 100)],
      resources: [resource(1, 10, 10)],
      from: { x: 0, y: 0 },
      to: { x: 50, y: 50 }
    })

    expect(result).toEqual({ kind: 'units', ids: [5] })
  })

  it('selects the lowest-id building whose footprint intersects the box', () => {
    const result = selectInBox({
      units: new Map(),
      buildings: [building(7, 0, 0), building(3, 10, 10), building(5, 12, 12)],
      resources: [resource(1, 10, 10)],
      from: { x: 10, y: 10 },
      to: { x: 20, y: 20 }
    })

    expect(result).toEqual({ kind: 'building', id: 3 })
  })

  it('accepts a box that overlaps only part of a footprint', () => {
    const result = selectInBox({
      units: new Map(),
      buildings: [building(4, 100, 100, 50, 50)],
      resources: [],
      from: { x: 140, y: 140 },
      to: { x: 160, y: 160 }
    })

    expect(result).toEqual({ kind: 'building', id: 4 })
  })

  it('falls back to the lowest-id resource inside an inverted box', () => {
    const result = selectInBox({
      units: new Map(),
      buildings: [],
      resources: [resource(9, 5, 5), resource(2, 10, 10), resource(6, 10, 10)],
      from: { x: 30.5, y: 30.5 },
      to: { x: 10, y: 10 }
    })

    expect(result).toEqual({ kind: 'resource', id: 2 })
  })

  it('returns none when nothing lies inside the box', () => {
    const result = selectInBox({
      units: new Map([[1, { x: 500, y: 500 }]]),
      buildings: [building(1, 500, 500)],
      resources: [resource(1, 500, 500)],
      from: { x: 0, y: 0 },
      to: { x: 100, y: 100 }
    })

    expect(result).toEqual({ kind: 'none' })
  })
})
