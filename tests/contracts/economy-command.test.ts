import { isCommandMessage } from '@rts/protocol'
import { START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  Building,
  Cargo,
  createSimulation,
  createWorld,
  Kind,
  MineralNode,
  Movement,
  Orders,
  Owner,
  Position
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../fixtures/index.js'

function economyWorld(secondWorkerKind: 'pawn' | 'warrior' = 'pawn') {
  const world = createWorld()
  const firstWorker = START_ENTITY_ID
  const secondWorker = START_ENTITY_ID + 1
  const node = START_ENTITY_ID + 2
  for (const [id, kind] of [
    [firstWorker, 'pawn'],
    [secondWorker, secondWorkerKind]
  ] as const) {
    world.createEntity(id)
    world.store(Position).set(id, { x: 0, y: 0 })
    world.store(Owner).set(id, { owner: 0 })
    world.store(Kind).set(id, kind)
    if (kind === 'pawn') {
      world.store(Cargo).set(id, { amount: 0, capacity: 10 })
    }
  }
  world.createEntity(node)
  world.store(Position).set(node, { x: tilesToFixed(2), y: 0 })
  world.store(MineralNode).set(node, { remaining: 3_000 })
  return { world, firstWorker, secondWorker, node }
}

describe('GATHER command contract', () => {
  it('accepts the integer wire shape and rejects fractional ids', () => {
    expect(
      isCommandMessage({
        type: 'command',
        intent: { type: 'GATHER', payload: { unitIds: [1, 2], nodeId: 3 } }
      })
    ).toBe(true)
    expect(
      isCommandMessage({
        type: 'command',
        intent: { type: 'GATHER', payload: { unitIds: [1], nodeId: 3.5 } }
      })
    ).toBe(false)
  })

  it('atomically starts owned workers toward a mineral node', () => {
    const { world, firstWorker, secondWorker, node } = economyWorld()
    const simulation = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: world
    })

    const result = simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'GATHER', payload: { unitIds: [secondWorker, firstWorker], nodeId: node } }
      }
    ])
    const state = simulation.inspectState().world

    expect(result.rejected).toEqual([])
    for (const worker of [firstWorker, secondWorker]) {
      expect(state.store(Orders).get(worker)?.queue).toEqual([
        { type: 'GATHER', nodeId: node, baseId: null, phase: 'TO_NODE', progressTicks: 0 }
      ])
      expect(state.store(Movement).get(worker)).toMatchObject({ destX: tilesToFixed(2), destY: 0 })
    }
  })

  it('rejects a mixed worker selection without mutating any entity', () => {
    const scenario = economyWorld('warrior')
    const controlScenario = economyWorld('warrior')
    const simulation = createSimulation({
      seed: SEEDS.integration.moveNonOwner,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveNonOwner,
      identity: TEST_IDENTITY,
      initialWorld: controlScenario.world
    })

    const result = simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: {
          type: 'GATHER',
          payload: { unitIds: [scenario.firstWorker, scenario.secondWorker], nodeId: scenario.node }
        }
      }
    ])
    control.step()

    expect(result.rejected[0]?.code).toBe('ENTITY_UNAVAILABLE')
    expect(simulation.hashState()).toBe(control.hashState())
  })

  it('rejects a mixed worker selection without mutating any entity', () => {
    const scenario = economyWorld()
    const controlScenario = economyWorld()
    const simulation = createSimulation({
      seed: SEEDS.integration.moveMissing,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveMissing,
      identity: TEST_IDENTITY,
      initialWorld: controlScenario.world
    })

    const result = simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: {
          type: 'GATHER',
          payload: { unitIds: [scenario.firstWorker], nodeId: scenario.secondWorker }
        }
      }
    ])
    control.step()

    expect(result.rejected[0]?.code).toBe('ENTITY_UNAVAILABLE')
    expect(simulation.hashState()).toBe(control.hashState())
  })
})

function depositWorld() {
  const world = createWorld()
  const base = START_ENTITY_ID
  const worker = START_ENTITY_ID + 1
  world.createEntity(base)
  world.store(Position).set(base, { x: 0, y: 0 })
  world.store(Owner).set(base, { owner: 0 })
  world.store(Building).set(base, {
    buildingType: 'BASE',
    status: 'COMPLETED',
    progressTicks: 1,
    totalTicks: 1,
    builderId: null,
    footprint: { x: 0, y: 0, width: 2, height: 2 }
  })
  world.createEntity(worker)
  world.store(Position).set(worker, { x: tilesToFixed(4), y: 0 })
  world.store(Owner).set(worker, { owner: 0 })
  world.store(Kind).set(worker, 'pawn')
  world.store(Cargo).set(worker, { amount: 4, capacity: 10 })
  return { world, base, worker }
}

describe('DEPOSIT command contract', () => {
  it('accepts the integer wire shape and rejects fractional building ids', () => {
    expect(
      isCommandMessage({
        type: 'command',
        intent: { type: 'DEPOSIT', payload: { unitIds: [1, 2], buildingId: 3 } }
      })
    ).toBe(true)
    expect(
      isCommandMessage({
        type: 'command',
        intent: { type: 'DEPOSIT', payload: { unitIds: [1], buildingId: 3.5 } }
      })
    ).toBe(false)
  })

  it('starts owned workers toward the ordered Base', () => {
    const { world, base, worker } = depositWorld()
    const simulation = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: world
    })

    const result = simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'DEPOSIT', payload: { unitIds: [worker], buildingId: base } }
      }
    ])
    const state = simulation.inspectState().world

    expect(result.rejected).toEqual([])
    expect(state.store(Orders).get(worker)?.queue).toEqual([{ type: 'DEPOSIT', buildingId: base }])
    expect(state.store(Movement).get(worker)).toMatchObject({ destX: 0, destY: 0 })
  })

  it('rejects a target that is not a completed owned Base without mutation', () => {
    const { world, worker } = depositWorld()
    const controlWorld = depositWorld().world
    const simulation = createSimulation({
      seed: SEEDS.integration.moveMissing,
      identity: TEST_IDENTITY,
      initialWorld: world
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveMissing,
      identity: TEST_IDENTITY,
      initialWorld: controlWorld
    })

    const result = simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'DEPOSIT', payload: { unitIds: [worker], buildingId: worker } }
      }
    ])
    control.step()

    expect(result.rejected[0]?.code).toBe('ENTITY_UNAVAILABLE')
    expect(simulation.hashState()).toBe(control.hashState())
  })
})
