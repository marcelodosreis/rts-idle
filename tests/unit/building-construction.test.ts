import { BARRACKS_BUILDING, BASE_BUILDING } from '@rts/game-data'
import { START_ENTITY_ID } from '@rts/shared'
import { Building, createSimulation, createWorld, simulationFromSnapshot } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../fixtures/index.js'

describe('base construction data and persistence', () => {
  it('defines a deterministic BASE footprint, cost, and duration', () => {
    expect(BASE_BUILDING).toEqual({
      type: 'BASE',
      label: 'Base',
      footprint: { width: 2, height: 2 },
      costMinerals: 100,
      constructionTicks: 100
    })
  })

  it('defines a deterministic BARRACKS footprint, cost, and duration', () => {
    expect(BARRACKS_BUILDING).toEqual({
      type: 'BARRACKS',
      label: 'Barracks',
      footprint: { width: 3, height: 3 },
      costMinerals: 150,
      constructionTicks: 100
    })
  })

  it('round-trips construction status, progress, builder, and footprint', () => {
    const world = createWorld()
    world.createEntity(START_ENTITY_ID)
    const sim = createSimulation({ seed: 1, identity: TEST_IDENTITY, initialWorld: world })
    world.store(Building).set(START_ENTITY_ID, {
      buildingType: 'BASE',
      status: 'UNDER_CONSTRUCTION',
      progressTicks: 7,
      totalTicks: 100,
      builderId: null,
      footprint: { x: 2, y: 3, width: 2, height: 2 }
    })
    const restored = simulationFromSnapshot(sim.exportSnapshot()).inspectState()
    expect(restored.world.store(Building).get(START_ENTITY_ID)).toEqual({
      buildingType: 'BASE',
      status: 'UNDER_CONSTRUCTION',
      progressTicks: 7,
      totalTicks: 100,
      builderId: null,
      footprint: { x: 2, y: 3, width: 2, height: 2 }
    })
  })

  it('round-trips BARRACKS construction state', () => {
    const world = createWorld()
    world.createEntity(START_ENTITY_ID)
    const sim = createSimulation({ seed: 1, identity: TEST_IDENTITY, initialWorld: world })
    world.store(Building).set(START_ENTITY_ID, {
      buildingType: 'BARRACKS',
      status: 'FOUNDATION',
      progressTicks: 0,
      totalTicks: 100,
      builderId: START_ENTITY_ID,
      footprint: { x: 4, y: 5, width: 3, height: 3 }
    })
    const restored = simulationFromSnapshot(sim.exportSnapshot()).inspectState()
    expect(restored.world.store(Building).get(START_ENTITY_ID)).toEqual({
      buildingType: 'BARRACKS',
      status: 'FOUNDATION',
      progressTicks: 0,
      totalTicks: 100,
      builderId: START_ENTITY_ID,
      footprint: { x: 4, y: 5, width: 3, height: 3 }
    })
  })
})
