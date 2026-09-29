import { constructionRefund, START_ENTITY_ID } from '@rts/shared'
import {
  Building,
  createSimulation,
  createWorld,
  Health,
  Kind,
  Orders,
  Owner,
  Position,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../../fixtures/index.js'

function scenario(
  gold = 100,
  workerPositions: Readonly<Record<number, { readonly x: number; readonly y: number }>> = {}
) {
  const world = createWorld()
  for (const id of [START_ENTITY_ID, START_ENTITY_ID + 1, START_ENTITY_ID + 2]) {
    world.createEntity(id)
    world.store(Position).set(id, workerPositions[id] ?? { x: 0, y: 0 })
    world.store(Owner).set(id, { owner: id === START_ENTITY_ID + 2 ? 1 : 0 })
    world.store(Kind).set(id, id === START_ENTITY_ID + 2 ? 'warrior' : 'pawn')
  }
  return createSimulation({
    seed: 7,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers: [0, 1, 2, 3].map((id) => ({ id: id as 0 | 1 | 2 | 3, defeated: false, gold: id === 0 ? gold : 0 }))
  })
}

const build = (workerId: number, sequence: number, x = 0, y = 0) => ({
  tick: 1,
  playerId: 0,
  sequence,
  intent: { type: 'BUILD' as const, payload: { unitId: workerId, buildingType: 'CASTLE' as const, x, y } }
})

const buildBarracks = (workerId: number, sequence: number) => ({
  tick: 1,
  playerId: 0,
  sequence,
  intent: { type: 'BUILD' as const, payload: { unitId: workerId, buildingType: 'BARRACKS' as const, x: 0, y: 0 } }
})

const buildDepot = (workerId: number, sequence: number) => ({
  tick: 1,
  playerId: 0,
  sequence,
  intent: { type: 'BUILD' as const, payload: { unitId: workerId, buildingType: 'HOUSE' as const, x: 0, y: 0 } }
})

const cancelConstruction = (buildingId: number, sequence: number) => ({
  tick: 2,
  playerId: 0,
  sequence,
  intent: { type: 'CANCEL_CONSTRUCTION' as const, payload: { buildingId } }
})

describe('BUILD simulation lifecycle', () => {
  it('pauses, transfers to another worker, and completes as a functional Base', () => {
    const sim = scenario()
    sim.step([build(START_ENTITY_ID, 1)])
    const buildingId = START_ENTITY_ID + 3
    sim.step([{ tick: 2, playerId: 0, sequence: 2, intent: { type: 'STOP', payload: { unitIds: [START_ENTITY_ID] } } }])
    expect(sim.inspectState().world.store(Building).get(buildingId)?.builderId).toBeNull()
    const paused = sim.inspectState().world.store(Building).get(buildingId)?.progressTicks
    sim.step([build(START_ENTITY_ID + 1, 3)])
    for (let i = 0; i < 150; i += 1) {
      sim.step()
    }
    const state = sim.inspectState()
    expect(state.world.store(Building).get(buildingId)?.progressTicks).toBe(100)
    expect(state.world.store(Building).get(buildingId)?.status).toBe('COMPLETED')
    expect(state.world.store(Building).has(buildingId)).toBe(true)
    expect(state.world.store(Health).get(buildingId)).toEqual({ current: 500, max: 500 })
    expect(state.world.store(Orders).get(START_ENTITY_ID + 1)).toBeUndefined()
    expect(state.world.store(Building).get(buildingId)?.progressTicks).toBeGreaterThanOrEqual(paused ?? 0)
  })

  it('continues with the same result after a construction snapshot restore', () => {
    const a = scenario()
    a.step([build(START_ENTITY_ID, 1)])
    for (let i = 0; i < 20; i += 1) {
      a.step()
    }
    const b = simulationFromSnapshot(a.exportSnapshot())
    for (let i = 0; i < 150; i += 1) {
      a.step()
      b.step()
    }
    expect(b.hashState()).toBe(a.hashState())
  })

  it('keeps a building at its requested position while its worker travels and builds', () => {
    const sim = scenario()
    const buildingPosition = { x: 4 * 256, y: 2 * 256 }
    const workerStart = sim.inspectState().world.store(Position).get(START_ENTITY_ID)
    sim.step([build(START_ENTITY_ID, 1, 4, 2)])
    const buildingId = START_ENTITY_ID + 3

    expect(sim.inspectState().world.store(Position).get(buildingId)).toEqual(buildingPosition)
    expect(sim.inspectState().world.store(Position).get(START_ENTITY_ID)).not.toEqual(buildingPosition)

    for (let i = 0; i < 70; i += 1) {
      sim.step()
      expect(sim.inspectState().world.store(Position).get(buildingId)).toEqual(buildingPosition)
    }
    expect(sim.inspectState().world.store(Position).get(START_ENTITY_ID)).not.toEqual(workerStart)

    for (let i = 0; i < 100; i += 1) {
      sim.step()
    }
    const state = sim.inspectState()
    expect(state.world.store(Position).get(buildingId)).toEqual(buildingPosition)
    expect(state.world.store(Building).has(buildingId)).toBe(true)
    expect(state.world.store(Building).get(buildingId)?.status).toBe('COMPLETED')
  })

  it('completes BARRACKS with only the Barracks marker', () => {
    const sim = scenario(150)
    sim.step([buildBarracks(START_ENTITY_ID, 1)])
    const buildingId = START_ENTITY_ID + 3
    for (let i = 0; i < 150; i += 1) {
      sim.step()
    }
    const state = sim.inspectState()
    expect(state.world.store(Building).get(buildingId)).toMatchObject({
      buildingType: 'BARRACKS',
      status: 'COMPLETED'
    })
    expect(state.world.store(Building).has(buildingId)).toBe(true)
    expect(state.world.store(Building).get(buildingId)?.buildingType).toBe('BARRACKS')
    expect(state.world.store(Orders).get(START_ENTITY_ID)).toBeUndefined()
  })

  it('sends the worker to the nearest construction edge and only progresses there', () => {
    const sim = scenario()
    sim.step([build(START_ENTITY_ID, 1, 4, 4)])
    const buildingId = START_ENTITY_ID + 3
    const order = sim.inspectState().world.store(Orders).get(START_ENTITY_ID)?.queue[0]

    expect(order).toMatchObject({ type: 'BUILD', workPoint: { x: 4 * 256, y: 5 * 256 + 256 } })
    expect(sim.inspectState().world.store(Building).get(buildingId)?.progressTicks).toBe(0)
    for (let i = 0; i < 100; i += 1) {
      sim.step()
      if (sim.inspectState().world.store(Building).get(buildingId)?.progressTicks !== 0) {
        break
      }
    }
    expect(sim.inspectState().world.store(Building).get(buildingId)?.progressTicks).toBeGreaterThan(0)
  })

  it('recalculates the work point when construction is reassigned', () => {
    const sim = scenario(100, { [START_ENTITY_ID + 1]: { x: 8 * 256, y: 5 * 256 } })
    sim.step([build(START_ENTITY_ID, 1, 4, 4)])
    const buildingId = START_ENTITY_ID + 3
    expect(sim.inspectState().world.store(Orders).get(START_ENTITY_ID)?.queue[0]).toMatchObject({
      workPoint: { x: 4 * 256, y: 5 * 256 + 256 }
    })

    sim.step([build(START_ENTITY_ID + 1, 2, 4, 4)])
    expect(
      sim
        .inspectState()
        .world.store(Orders)
        .get(START_ENTITY_ID + 1)?.queue[0]
    ).toMatchObject({
      buildingId,
      workPoint: { x: 9 * 256, y: 5 * 256 + 256 }
    })
  })

  it('keeps BARRACKS deterministic across a construction snapshot restore', () => {
    const a = scenario(150)
    a.step([buildBarracks(START_ENTITY_ID, 1)])
    for (let i = 0; i < 20; i += 1) {
      a.step()
    }
    const b = simulationFromSnapshot(a.exportSnapshot())
    for (let i = 0; i < 100; i += 1) {
      a.step()
      b.step()
    }
    expect(b.hashState()).toBe(a.hashState())
  })

  it('activates Supply Depot capacity only on its completion tick', () => {
    const sim = scenario(100, { [START_ENTITY_ID]: { x: 256, y: 0 } })
    sim.step([buildDepot(START_ENTITY_ID, 1)])
    expect(sim.inspectState().players[0]?.supplyCap).toBe(0)
    for (let i = 0; i < 98; i += 1) {
      sim.step()
      expect(sim.inspectState().players[0]?.supplyCap).toBe(0)
    }
    sim.step()
    expect(sim.inspectState().players[0]?.supplyCap).toBe(8)
  })

  it('cancels a construction, refunds, and frees the footprint for rebuilding', () => {
    const sim = scenario(200)
    sim.step([build(START_ENTITY_ID, 1, 4, 4)])
    const buildingId = START_ENTITY_ID + 3
    const result = sim.step([cancelConstruction(buildingId, 2)])
    const state = sim.inspectState()
    expect(result.rejected).toEqual([])
    expect(state.world.store(Building).has(buildingId)).toBe(false)
    expect(state.players[0]?.gold).toBe(175)
    expect(state.world.store(Orders).get(START_ENTITY_ID)?.queue[0]?.type).not.toBe('BUILD')
    expect(sim.step([build(START_ENTITY_ID, 3, 4, 4)]).rejected).toEqual([])
  })

  it('refunds proportionally to the remaining construction progress', () => {
    const sim = scenario(100, { [START_ENTITY_ID]: { x: 256, y: 0 } })
    sim.step([build(START_ENTITY_ID, 1)])
    const buildingId = START_ENTITY_ID + 3
    let progress = 0
    for (let i = 0; i < 100 && progress === 0; i += 1) {
      sim.step()
      progress = sim.inspectState().world.store(Building).get(buildingId)?.progressTicks ?? 0
    }
    expect(progress).toBeGreaterThan(0)
    sim.step([cancelConstruction(buildingId, 2)])
    expect(sim.inspectState().players[0]?.gold).toBe(constructionRefund(100, progress, 100))
  })

  it('leaves the builder where it is when cancelling a construction in progress', () => {
    const sim = scenario()
    sim.step([build(START_ENTITY_ID, 1, 4, 4)])
    const buildingId = START_ENTITY_ID + 3
    for (let i = 0; i < 5; i += 1) {
      sim.step()
    }
    const before = sim.inspectState().world.store(Position).get(START_ENTITY_ID)
    sim.step([cancelConstruction(buildingId, 2)])
    expect(sim.inspectState().world.store(Position).get(START_ENTITY_ID)).toEqual(before)
  })
})
