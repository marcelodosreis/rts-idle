import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { FIXED_SCALE, tilesToFixed } from '@rts/shared'
import { Building, createUnitEntity, createWorld, createWorldSpatialIndex, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'

function addBuilding(world: ReturnType<typeof createWorld>, id: number, x: number, y: number): void {
  world.createEntity(id)
  world.store(Position).set(id, { x: tilesToFixed(x), y: tilesToFixed(y) })
  world.store(Building).set(id, {
    buildingType: 'HOUSE',
    status: 'COMPLETED',
    progressTicks: 1,
    totalTicks: 1,
    builderId: null,
    footprint: { x, y, ...BUILDING_DEFINITIONS.HOUSE.footprint },
    rallyPoint: null
  })
}

describe('world spatial index', () => {
  it('indexes units and rectangular building footprints independently', () => {
    const world = createWorld()
    createUnitEntity(world, { id: 1, x: 0, y: 0, owner: 0, kind: 'pawn' })
    createUnitEntity(world, { id: 2, x: tilesToFixed(4), y: 0, owner: 1, kind: 'warrior' })
    addBuilding(world, 3, 2, 2)
    const state = { world }

    const index = createWorldSpatialIndex(state)

    expect(index.units.query({ minX: -FIXED_SCALE, minY: -FIXED_SCALE, maxX: FIXED_SCALE, maxY: FIXED_SCALE })).toEqual(
      [1]
    )
    expect(
      index.buildings.query({
        minX: tilesToFixed(2),
        minY: tilesToFixed(2),
        maxX: tilesToFixed(3),
        maxY: tilesToFixed(3)
      })
    ).toEqual([3])
  })

  it('reflects movement and lifecycle changes when rebuilt', () => {
    const world = createWorld()
    createUnitEntity(world, { id: 1, x: 0, y: 0, owner: 0, kind: 'pawn' })
    const state = { world }
    const initial = createWorldSpatialIndex(state)
    world.store(Position).set(1, { x: tilesToFixed(6), y: 0 })
    const moved = createWorldSpatialIndex(state)

    expect(initial.units.query({ minX: -100, minY: -100, maxX: 100, maxY: 100 })).toEqual([1])
    expect(moved.units.query({ minX: -100, minY: -100, maxX: 100, maxY: 100 })).toEqual([])
  })
})
