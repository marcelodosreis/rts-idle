import { SUPPLY_DEPOT_BUILDING } from '@rts/game-data'
import { START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  Building,
  createSimulation,
  createWorld,
  Kind,
  Owner,
  Position,
  simulationFromSnapshot,
  updateSupply
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../../fixtures/index.js'

function worldWithBaseAndUnits(unitCount: number): ReturnType<typeof createWorld> {
  const world = createWorld()
  world.createEntity(START_ENTITY_ID)
  world.store(Position).set(START_ENTITY_ID, { x: 0, y: 0 })
  world.store(Owner).set(START_ENTITY_ID, { owner: 0 })
  world.store(Building).set(START_ENTITY_ID, {
    buildingType: 'BASE',
    status: 'COMPLETED',
    progressTicks: 100,
    totalTicks: 100,
    builderId: null,
    footprint: { x: 0, y: 0, width: 2, height: 2 }
  })
  for (let index = 0; index < unitCount; index += 1) {
    const id = START_ENTITY_ID + index + 1
    world.createEntity(id)
    world.store(Position).set(id, { x: tilesToFixed(4 + index), y: 0 })
    world.store(Owner).set(id, { owner: 0 })
    world.store(Kind).set(id, 'pawn')
  }
  return world
}

describe('authoritative supply accounting', () => {
  it('starts with Base capacity and one supply per existing unit', () => {
    const state = createSimulation({
      seed: 1,
      identity: TEST_IDENTITY,
      initialWorld: worldWithBaseAndUnits(4)
    }).inspectState()

    expect(state.players[0]).toMatchObject({ usedSupply: 4, supplyCap: 10 })
  })

  it('does not count an unfinished Depot and activates it on completion', () => {
    const world = worldWithBaseAndUnits(1)
    world.createEntity(START_ENTITY_ID + 2)
    world.store(Position).set(START_ENTITY_ID + 2, { x: tilesToFixed(4), y: 0 })
    world.store(Owner).set(START_ENTITY_ID + 2, { owner: 0 })
    world.store(Building).set(START_ENTITY_ID + 2, {
      buildingType: 'SUPPLY_DEPOT',
      status: 'UNDER_CONSTRUCTION',
      progressTicks: 99,
      totalTicks: SUPPLY_DEPOT_BUILDING.constructionTicks,
      builderId: null,
      footprint: { x: 4, y: 0, ...SUPPLY_DEPOT_BUILDING.footprint }
    })
    const state = createSimulation({ seed: 1, identity: TEST_IDENTITY, initialWorld: world }).inspectState()
    expect(state.players[0]?.supplyCap).toBe(10)
    state.world.store(Building).set(START_ENTITY_ID + 2, {
      ...state.world.store(Building).get(START_ENTITY_ID + 2)!,
      status: 'COMPLETED',
      progressTicks: SUPPLY_DEPOT_BUILDING.constructionTicks
    })
    updateSupply(state)
    expect(state.players[0]).toMatchObject({ usedSupply: 1, supplyCap: 18 })
  })

  it('allows over-cap after a completed Depot is removed without removing units', () => {
    const world = worldWithBaseAndUnits(12)
    const depotId = START_ENTITY_ID + 13
    world.createEntity(depotId)
    world.store(Position).set(depotId, { x: 20, y: 20 })
    world.store(Owner).set(depotId, { owner: 0 })
    world.store(Building).set(depotId, {
      buildingType: 'SUPPLY_DEPOT',
      status: 'COMPLETED',
      progressTicks: 100,
      totalTicks: 100,
      builderId: null,
      footprint: { x: 20, y: 20, width: 2, height: 2 }
    })
    const state = createSimulation({ seed: 1, identity: TEST_IDENTITY, initialWorld: world }).inspectState()
    state.world.removeEntity(depotId)
    updateSupply(state)
    expect(state.players[0]).toMatchObject({ usedSupply: 12, supplyCap: 10 })
    expect(state.world.aliveIds()).toContain(START_ENTITY_ID + 1)
  })

  it('caps capacity at 200', () => {
    const world = worldWithBaseAndUnits(0)
    for (let index = 0; index < 30; index += 1) {
      const id = START_ENTITY_ID + index + 1
      world.createEntity(id)
      world.store(Position).set(id, { x: 4 + index * 2, y: 0 })
      world.store(Owner).set(id, { owner: 0 })
      world.store(Building).set(id, {
        buildingType: 'SUPPLY_DEPOT',
        status: 'COMPLETED',
        progressTicks: 100,
        totalTicks: 100,
        builderId: null,
        footprint: { x: 4 + index * 2, y: 0, width: 2, height: 2 }
      })
    }
    expect(
      createSimulation({ seed: 1, identity: TEST_IDENTITY, initialWorld: world }).inspectState().players[0]?.supplyCap
    ).toBe(200)
  })

  it('preserves supply through snapshot restore and deterministic hash', () => {
    const sim = createSimulation({ seed: 1, identity: TEST_IDENTITY, initialWorld: worldWithBaseAndUnits(4) })
    const restored = simulationFromSnapshot(sim.exportSnapshot())
    expect(restored.inspectState().players[0]).toMatchObject({ usedSupply: 4, supplyCap: 10 })
    expect(restored.hashState()).toBe(sim.hashState())
  })
})
