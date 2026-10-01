import { START_ENTITY_ID } from '@rts/shared'
import {
  Building,
  Cargo,
  createSimulation,
  createWorld,
  Orders,
  Position,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../../fixtures/index.js'

describe('economy ECS state', () => {
  it('round-trips cargo and gather progress through a snapshot', () => {
    const world = createWorld()
    world.createEntity(START_ENTITY_ID)
    world.store(Position).set(START_ENTITY_ID, { x: 100, y: 200 })
    world.store(Building).set(START_ENTITY_ID, {
      buildingType: 'CASTLE',
      status: 'COMPLETED',
      progressTicks: 1,
      totalTicks: 1,
      builderId: null,
      footprint: { x: 0, y: 0, width: 2, height: 2 }
    })
    world.store(Cargo).set(START_ENTITY_ID, { amount: 4, capacity: 10 })
    world.store(Orders).set(START_ENTITY_ID, {
      queue: [
        {
          type: 'GATHER',
          resourceId: 1,
          baseId: null,
          phase: 'HARVESTING',
          progressTicks: 9
        }
      ]
    })
    const simulation = createSimulation({
      seed: SEEDS.simulation.snapshotRoundtrip,
      identity: TEST_IDENTITY,
      initialWorld: world
    })

    const restored = simulationFromSnapshot(simulation.exportSnapshot()).inspectState().world

    expect(restored.store(Building).get(START_ENTITY_ID)).toMatchObject({ buildingType: 'CASTLE', status: 'COMPLETED' })
    expect(restored.store(Cargo).get(START_ENTITY_ID)).toEqual({ amount: 4, capacity: 10, resourceType: null })
    expect(restored.store(Orders).get(START_ENTITY_ID)?.queue).toEqual([
      {
        type: 'GATHER',
        resourceId: 1,
        baseId: null,
        phase: 'HARVESTING',
        progressTicks: 9
      }
    ])
  })

  it('removes economy component data with the entity', () => {
    const world = createWorld()
    world.createEntity(START_ENTITY_ID)
    world.store(Building).set(START_ENTITY_ID, {
      buildingType: 'CASTLE',
      status: 'COMPLETED',
      progressTicks: 1,
      totalTicks: 1,
      builderId: null,
      footprint: { x: 0, y: 0, width: 2, height: 2 }
    })
    world.store(Cargo).set(START_ENTITY_ID, { amount: 10, capacity: 10 })

    world.removeEntity(START_ENTITY_ID)

    expect(world.store(Building).has(START_ENTITY_ID)).toBe(false)
    expect(world.store(Cargo).has(START_ENTITY_ID)).toBe(false)
  })
})
