import { BARRACKS_BUILDING, BASE_BUILDING, BUILDING_FOOTPRINTS, SUPPLY_DEPOT_BUILDING } from '@rts/game-data'
import { START_ENTITY_ID } from '@rts/shared'
import { Building, createSimulation, createWorld, simulationFromSnapshot } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../../fixtures/index.js'

describe('base construction data and persistence', () => {
  it('defines a deterministic BASE footprint, cost, and duration', () => {
    expect(BASE_BUILDING).toEqual({
      type: 'BASE',
      label: 'Base',
      footprint: BUILDING_FOOTPRINTS.BASE,
      costMinerals: 100,
      constructionTicks: 100,
      supplyProvided: 10
    })
  })

  it('defines a deterministic BARRACKS footprint, cost, and duration', () => {
    expect(BARRACKS_BUILDING).toEqual({
      type: 'BARRACKS',
      label: 'Barracks',
      footprint: BUILDING_FOOTPRINTS.BARRACKS,
      costMinerals: 150,
      constructionTicks: 100,
      supplyProvided: 0
    })
  })

  it('defines a deterministic Supply Depot footprint, cost, duration, and capacity', () => {
    expect(SUPPLY_DEPOT_BUILDING).toEqual({
      type: 'SUPPLY_DEPOT',
      label: 'Supply Depot',
      footprint: BUILDING_FOOTPRINTS.SUPPLY_DEPOT,
      costMinerals: 100,
      constructionTicks: 100,
      supplyProvided: 8
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
      footprint: { x: 2, y: 3, ...BUILDING_FOOTPRINTS.BASE },
      rallyPoint: null
    })
    const restored = simulationFromSnapshot(sim.exportSnapshot()).inspectState()
    expect(restored.world.store(Building).get(START_ENTITY_ID)).toEqual({
      buildingType: 'BASE',
      status: 'UNDER_CONSTRUCTION',
      progressTicks: 7,
      totalTicks: 100,
      builderId: null,
      footprint: { x: 2, y: 3, ...BUILDING_FOOTPRINTS.BASE },
      rallyPoint: null
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
      footprint: { x: 4, y: 5, ...BUILDING_FOOTPRINTS.BARRACKS },
      rallyPoint: null
    })
    const restored = simulationFromSnapshot(sim.exportSnapshot()).inspectState()
    expect(restored.world.store(Building).get(START_ENTITY_ID)).toEqual({
      buildingType: 'BARRACKS',
      status: 'FOUNDATION',
      progressTicks: 0,
      totalTicks: 100,
      builderId: START_ENTITY_ID,
      footprint: { x: 4, y: 5, ...BUILDING_FOOTPRINTS.BARRACKS },
      rallyPoint: null
    })
  })
})
