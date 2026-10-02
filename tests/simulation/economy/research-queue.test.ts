import { START_ENTITY_ID } from '@rts/shared'
import {
  Building,
  Cargo,
  createSimulation,
  createUnitEntity,
  createWorld,
  Owner,
  Position,
  Production
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../../fixtures/index.js'

function researchScenario(withSecondMonastery = false, gold = 500) {
  const world = createWorld()
  world.createEntity(START_ENTITY_ID)
  world.store(Position).set(START_ENTITY_ID, { x: 0, y: 0 })
  world.store(Owner).set(START_ENTITY_ID, { owner: 0 })
  world.store(Building).set(START_ENTITY_ID, {
    buildingType: 'MONASTERY',
    status: 'COMPLETED',
    progressTicks: 1,
    totalTicks: 1,
    builderId: null,
    footprint: { x: 0, y: 0, width: 3, height: 5 }
  })
  world.store(Production).set(START_ENTITY_ID, { queue: [] })
  world.createEntity(START_ENTITY_ID + 1)
  world.store(Position).set(START_ENTITY_ID + 1, { x: 10, y: 0 })
  world.store(Owner).set(START_ENTITY_ID + 1, { owner: 0 })
  world.store(Building).set(START_ENTITY_ID + 1, {
    buildingType: 'CASTLE',
    status: 'COMPLETED',
    progressTicks: 100,
    totalTicks: 100,
    builderId: null,
    tier: 2,
    footprint: { x: 10, y: 0, width: 5, height: 4 }
  })
  createUnitEntity(world, { id: START_ENTITY_ID + 3, x: 20, y: 0, owner: 0, kind: 'pawn' })
  if (withSecondMonastery) {
    world.createEntity(START_ENTITY_ID + 2)
    world.store(Position).set(START_ENTITY_ID + 2, { x: 15, y: 0 })
    world.store(Owner).set(START_ENTITY_ID + 2, { owner: 0 })
    world.store(Building).set(START_ENTITY_ID + 2, {
      buildingType: 'MONASTERY',
      status: 'COMPLETED',
      progressTicks: 100,
      totalTicks: 100,
      builderId: null,
      footprint: { x: 15, y: 0, width: 3, height: 5 }
    })
    world.store(Production).set(START_ENTITY_ID + 2, { queue: [] })
  }
  return createSimulation({
    seed: 1,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers: [
      { id: 0, defeated: false, resources: { GOLD: gold, WOOD: 0 }, highestCastleTierReached: 2 },
      { id: 1, defeated: false, resources: { GOLD: 0, WOOD: 0 } },
      { id: 2, defeated: false, resources: { GOLD: 0, WOOD: 0 } },
      { id: 3, defeated: false, resources: { GOLD: 0, WOOD: 0 } }
    ]
  })
}

describe('research queue', () => {
  it('shares one FIFO queue between Research and Monk training', () => {
    const simulation = researchScenario()
    const result = simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'RESEARCH', payload: { monasteryId: START_ENTITY_ID, researchType: 'ATTACK' } }
      },
      {
        tick: 1,
        playerId: 0,
        sequence: 2,
        intent: { type: 'TRAIN', payload: { producerId: START_ENTITY_ID, unitKind: 'monk' } }
      }
    ])

    expect(result.rejected).toEqual([])
    expect(simulation.inspectState().world.store(Production).get(START_ENTITY_ID)?.queue).toMatchObject([
      { researchType: 'ATTACK', status: 'ACTIVE', progressTicks: 1 },
      { unitKind: 'monk', status: 'QUEUED', progressTicks: 0 }
    ])
  })

  it('rejects the sixth mixed item when the shared queue is full', () => {
    const simulation = researchScenario(false, 1_000)
    const result = simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'TRAIN', payload: { producerId: START_ENTITY_ID, unitKind: 'monk' } }
      },
      {
        tick: 1,
        playerId: 0,
        sequence: 2,
        intent: { type: 'RESEARCH', payload: { monasteryId: START_ENTITY_ID, researchType: 'ATTACK' } }
      },
      {
        tick: 1,
        playerId: 0,
        sequence: 3,
        intent: { type: 'TRAIN', payload: { producerId: START_ENTITY_ID, unitKind: 'monk' } }
      },
      {
        tick: 1,
        playerId: 0,
        sequence: 4,
        intent: { type: 'RESEARCH', payload: { monasteryId: START_ENTITY_ID, researchType: 'DEFENSE' } }
      },
      {
        tick: 1,
        playerId: 0,
        sequence: 5,
        intent: { type: 'RESEARCH', payload: { monasteryId: START_ENTITY_ID, researchType: 'ECONOMY' } }
      },
      {
        tick: 1,
        playerId: 0,
        sequence: 6,
        intent: { type: 'RESEARCH', payload: { monasteryId: START_ENTITY_ID, researchType: 'MOVEMENT' } }
      }
    ])

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]?.code).toBe('INVALID_STATE')
    expect(simulation.inspectState().world.store(Production).get(START_ENTITY_ID)?.queue).toHaveLength(5)
  })

  it('reserves gold and completes Attack after its authored duration', () => {
    const simulation = researchScenario()
    simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'RESEARCH', payload: { monasteryId: START_ENTITY_ID, researchType: 'ATTACK' } }
      }
    ])

    expect(simulation.inspectState().players[0]).toMatchObject({ resources: { GOLD: 350 } })
    for (let tick = 0; tick < 598; tick += 1) {
      simulation.step()
    }
    expect(simulation.inspectState().players[0]?.completedResearch).toEqual([])
    simulation.step()
    expect(simulation.inspectState().players[0]?.completedResearch).toEqual(['ATTACK'])
  })

  it('refunds a cancelled active research item proportionally', () => {
    const simulation = researchScenario()
    const result = simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'RESEARCH', payload: { monasteryId: START_ENTITY_ID, researchType: 'ATTACK' } }
      },
      {
        tick: 1,
        playerId: 0,
        sequence: 2,
        intent: { type: 'CANCEL_RESEARCH', payload: { monasteryId: START_ENTITY_ID, queueIndex: 0 } }
      }
    ])

    expect(result.rejected).toEqual([])
    expect(simulation.inspectState().players[0]?.resources.GOLD).toBe(462)
    expect(simulation.inspectState().world.store(Production).get(START_ENTITY_ID)?.queue).toEqual([])
  })

  it('allows different topics in separate Monasteries', () => {
    const simulation = researchScenario(true)
    const secondMonasteryId = START_ENTITY_ID + 2

    const result = simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'RESEARCH', payload: { monasteryId: START_ENTITY_ID, researchType: 'ATTACK' } }
      },
      {
        tick: 1,
        playerId: 0,
        sequence: 2,
        intent: { type: 'RESEARCH', payload: { monasteryId: secondMonasteryId, researchType: 'DEFENSE' } }
      }
    ])

    expect(result.rejected).toEqual([])
    const state = simulation.inspectState()
    expect(state.world.store(Production).get(START_ENTITY_ID)?.queue).toHaveLength(1)
    expect(state.world.store(Production).get(secondMonasteryId)?.queue).toHaveLength(1)
  })

  it('rejects the same topic in another Monastery while it is queued', () => {
    const simulation = researchScenario(true)
    const secondMonasteryId = START_ENTITY_ID + 2

    const result = simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'RESEARCH', payload: { monasteryId: START_ENTITY_ID, researchType: 'ATTACK' } }
      },
      {
        tick: 1,
        playerId: 0,
        sequence: 2,
        intent: { type: 'RESEARCH', payload: { monasteryId: secondMonasteryId, researchType: 'ATTACK' } }
      }
    ])

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]?.code).toBe('INVALID_STATE')
    expect(simulation.inspectState().world.store(Production).get(secondMonasteryId)?.queue).toEqual([])
  })

  it('refreshes existing Pawn cargo when Economy completes', () => {
    const simulation = researchScenario()
    simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'RESEARCH', payload: { monasteryId: START_ENTITY_ID, researchType: 'ECONOMY' } }
      }
    ])
    for (let tick = 0; tick < 698; tick += 1) {
      simulation.step()
    }

    expect(() => simulation.step()).not.toThrow()
    expect(simulation.inspectState().players[0]?.completedResearch).toEqual(['ECONOMY'])
    expect(
      simulation
        .inspectState()
        .world.store(Cargo)
        .get(START_ENTITY_ID + 3)?.capacity
    ).toBe(12)
  })
})
