import { FIXED_SCALE } from '@rts/shared'
import {
  type BuildingFootprint,
  constructionWorkPoint,
  type PlacementMapBounds,
  validateBuildingPlacement
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'

const bounds: PlacementMapBounds = { width: 10, height: 8 }
const valid = (x: number, y: number, width = 1, height = 1): BuildingFootprint => ({ x, y, width, height })

describe('building placement validation (BUILD-001)', () => {
  it('accepts a 1×1 footprint in the valid corner and a 4×4 footprint inside the map', () => {
    expect(validateBuildingPlacement(bounds, [], valid(0, 0))).toEqual({ ok: true })
    expect(validateBuildingPlacement(bounds, [], valid(3, 2, 4, 4))).toEqual({ ok: true })
  })

  it.each([
    ['left', valid(-1, 2)],
    ['right', valid(10, 2)],
    ['top', valid(2, -1)],
    ['bottom', valid(2, 8)],
    ['right edge', valid(8, 2, 3, 1)],
    ['bottom edge', valid(2, 6, 1, 3)]
  ])('rejects a footprint beyond the %s map boundary', (_name, candidate) => {
    expect(validateBuildingPlacement(bounds, [], candidate)).toEqual({ ok: false, reason: 'OUT_OF_BOUNDS' })
  })

  it.each([valid(1, 1, 0, 1), valid(1, 1, 1, 0), valid(1, 1, -1, 1), valid(1, 1, 1, -1)])(
    'rejects non-positive dimensions: %j',
    (candidate) => {
      expect(validateBuildingPlacement(bounds, [], candidate)).toEqual({ ok: false, reason: 'INVALID_FOOTPRINT' })
    }
  )

  it('rejects a fractional origin as an invalid tile', () => {
    expect(validateBuildingPlacement(bounds, [], valid(1.5, 2))).toEqual({ ok: false, reason: 'INVALID_TILE' })
  })

  it('rejects any footprint cell marked invalid', () => {
    const map = { ...bounds, invalidTiles: [{ x: 3, y: 3 }] }
    expect(validateBuildingPlacement(map, [], valid(2, 2, 2, 2))).toEqual({ ok: false, reason: 'INVALID_TILE' })
  })

  it.each([valid(2, 2, 2, 2), valid(3, 3, 1, 1)])('rejects partial and total overlap: %j', (candidate) => {
    expect(validateBuildingPlacement(bounds, [valid(2, 2, 2, 2)], candidate)).toEqual({ ok: false, reason: 'OVERLAP' })
  })

  it('allows footprints that only share an edge', () => {
    expect(validateBuildingPlacement(bounds, [valid(2, 2, 2, 2)], valid(4, 2, 2, 2))).toEqual({ ok: true })
  })

  it('is independent of occupied-footprint order and does not mutate inputs', () => {
    const occupied = [valid(6, 1, 2, 2), valid(1, 5, 2, 2)]
    const candidate = valid(3, 3, 2, 2)
    const occupiedBefore = structuredClone(occupied)
    const candidateBefore = structuredClone(candidate)
    const first = validateBuildingPlacement(bounds, occupied, candidate)
    const second = validateBuildingPlacement(bounds, [...occupied].reverse(), candidate)
    expect(first).toEqual({ ok: true })
    expect(second).toEqual(first)
    expect(occupied).toEqual(occupiedBefore)
    expect(candidate).toEqual(candidateBefore)
  })
})

describe('construction work point', () => {
  const footprint = { x: 4, y: 4, width: 2, height: 2 }
  const mapBounds = { width: 16, height: 16 }
  const fixed = (x: number, y: number) => ({ x: x * FIXED_SCALE, y: y * FIXED_SCALE })

  it.each([
    ['top', fixed(5, 4), fixed(5, 1)],
    ['right', fixed(6, 5), fixed(8, 5)],
    ['bottom', fixed(5, 6), fixed(5, 8)],
    ['left', fixed(4, 5), fixed(1, 5)]
  ])('chooses the %s side for the nearest worker', (_side, expected, worker) => {
    expect(constructionWorkPoint(worker, footprint, mapBounds)).toEqual(expected)
  })

  it.each([
    ['upper-left diagonal', fixed(1, 3), fixed(4, 5)],
    ['lower-right diagonal', fixed(8, 7), fixed(6, 5)]
  ])('chooses the truly nearest side from the %s', (_position, worker, expected) => {
    expect(constructionWorkPoint(worker, footprint, mapBounds)).toEqual(expected)
  })

  it('uses top as the deterministic tie-breaker', () => {
    expect(constructionWorkPoint(fixed(6, 4), footprint, mapBounds)).toEqual(fixed(5, 4))
  })

  it.each([
    ['top', { x: 4, y: 0 }, fixed(5, 0), fixed(5, 0)],
    ['right', { x: 14, y: 4 }, fixed(15, 5), fixed(15, 5)],
    ['bottom', { x: 4, y: 14 }, fixed(5, 15), fixed(5, 15)],
    ['left', { x: 0, y: 4 }, fixed(0, 5), fixed(0, 5)]
  ])('keeps a work point valid on the %s map border', (_side, footprintAtEdge, worker, expected) => {
    expect(
      constructionWorkPoint(worker, { ...footprintAtEdge, width: 2, height: 2 }, { width: 16, height: 16 })
    ).toEqual(expected)
  })
})
