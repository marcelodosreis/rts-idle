import { BARRACKS_BUILDING, BUILDING_FOOTPRINTS, CASTLE_BUILDING, HOUSE_BUILDING } from '@rts/game-data'
import { START_ENTITY_ID } from '@rts/shared'
import { Building, createSimulation, createWorld, simulationFromSnapshot } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../../fixtures/index.js'

describe('base construction data and persistence', () => {
  it('defines a deterministic BASE footprint, cost, and duration', () => {
    expect(CASTLE_BUILDING).toEqual({
      type: 'CASTLE',
      label: 'Castle',
      footprint: BUILDING_FOOTPRINTS.CASTLE,
      cost: { GOLD: 100 },
      constructionTicks: 100,
      supplyProvided: 10,
      maxHp: 500,
      mechanical: true
    })
  })

  it('defines a deterministic BARRACKS footprint, cost, and duration', () => {
    expect(BARRACKS_BUILDING).toEqual({
      type: 'BARRACKS',
      label: 'Barracks',
      footprint: BUILDING_FOOTPRINTS.BARRACKS,
      cost: { GOLD: 150 },
      constructionTicks: 100,
      supplyProvided: 0,
      maxHp: 400,
      mechanical: true
    })
  })

  it('defines a deterministic Supply Depot footprint, cost, duration, and capacity', () => {
    expect(HOUSE_BUILDING).toEqual({
      type: 'HOUSE',
      label: 'House',
      footprint: BUILDING_FOOTPRINTS.HOUSE,
      cost: { GOLD: 100 },
      constructionTicks: 100,
      supplyProvided: 8,
      maxHp: 250,
      mechanical: true
    })
  })

  it('round-trips construction status, progress, builder, and footprint', () => {
    const world = createWorld()
    world.createEntity(START_ENTITY_ID)
    const sim = createSimulation({ seed: 1, identity: TEST_IDENTITY, initialWorld: world })
    world.store(Building).set(START_ENTITY_ID, {
      buildingType: 'CASTLE',
      status: 'UNDER_CONSTRUCTION',
      progressTicks: 7,
      totalTicks: 100,
      builderId: null,
      tier: 1,
      tierUpgrade: null,
      footprint: { x: 2, y: 3, ...BUILDING_FOOTPRINTS.CASTLE },
      rallyPoint: null
    })
    const restored = simulationFromSnapshot(sim.exportSnapshot()).inspectState()
    expect(restored.world.store(Building).get(START_ENTITY_ID)).toEqual({
      buildingType: 'CASTLE',
      status: 'UNDER_CONSTRUCTION',
      progressTicks: 7,
      totalTicks: 100,
      builderId: null,
      tier: 1,
      tierUpgrade: null,
      footprint: { x: 2, y: 3, ...BUILDING_FOOTPRINTS.CASTLE },
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
      tier: 1,
      tierUpgrade: null,
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
      tier: 1,
      tierUpgrade: null,
      footprint: { x: 4, y: 5, ...BUILDING_FOOTPRINTS.BARRACKS },
      rallyPoint: null
    })
  })
})
