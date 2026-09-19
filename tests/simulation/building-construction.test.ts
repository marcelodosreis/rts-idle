import { START_ENTITY_ID } from '@rts/shared'
import {
  Barracks,
  Base,
  Construction,
  createSimulation,
  createWorld,
  Kind,
  Orders,
  Owner,
  Position,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../fixtures/index.js'

function scenario(gold = 100) {
  const world = createWorld()
  for (const id of [START_ENTITY_ID, START_ENTITY_ID + 1, START_ENTITY_ID + 2]) {
    world.createEntity(id)
    world.store(Position).set(id, { x: 0, y: 0 })
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

const build = (workerId: number, sequence: number) => ({
  tick: 1,
  playerId: 0,
  sequence,
  intent: { type: 'BUILD' as const, payload: { unitId: workerId, buildingType: 'BASE' as const, x: 0, y: 0 } }
})

const buildBarracks = (workerId: number, sequence: number) => ({
  tick: 1,
  playerId: 0,
  sequence,
  intent: { type: 'BUILD' as const, payload: { unitId: workerId, buildingType: 'BARRACKS' as const, x: 0, y: 0 } }
})

describe('BUILD simulation lifecycle', () => {
  it('pauses, transfers to another worker, and completes as a functional Base', () => {
    const sim = scenario()
    sim.step([build(START_ENTITY_ID, 1)])
    const buildingId = START_ENTITY_ID + 3
    sim.step([{ tick: 2, playerId: 0, sequence: 2, intent: { type: 'STOP', payload: { unitIds: [START_ENTITY_ID] } } }])
    expect(sim.inspectState().world.store(Construction).get(buildingId)?.builderId).toBeNull()
    const paused = sim.inspectState().world.store(Construction).get(buildingId)?.progressTicks
    sim.step([build(START_ENTITY_ID + 1, 3)])
    for (let i = 0; i < 100; i += 1) {
      sim.step()
    }
    const state = sim.inspectState()
    expect(state.world.store(Construction).get(buildingId)?.progressTicks).toBe(100)
    expect(state.world.store(Construction).get(buildingId)?.status).toBe('COMPLETED')
    expect(state.world.store(Base).has(buildingId)).toBe(true)
    expect(state.world.store(Orders).get(START_ENTITY_ID + 1)).toBeUndefined()
    expect(state.world.store(Construction).get(buildingId)?.progressTicks).toBeGreaterThanOrEqual(paused ?? 0)
  })

  it('continues with the same result after a construction snapshot restore', () => {
    const a = scenario()
    a.step([build(START_ENTITY_ID, 1)])
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

  it('completes BARRACKS with only the Barracks marker', () => {
    const sim = scenario(150)
    sim.step([buildBarracks(START_ENTITY_ID, 1)])
    const buildingId = START_ENTITY_ID + 3
    for (let i = 0; i < 100; i += 1) {
      sim.step()
    }
    const state = sim.inspectState()
    expect(state.world.store(Construction).get(buildingId)).toMatchObject({
      buildingType: 'BARRACKS',
      status: 'COMPLETED'
    })
    expect(state.world.store(Barracks).has(buildingId)).toBe(true)
    expect(state.world.store(Base).has(buildingId)).toBe(false)
    expect(state.world.store(Orders).get(START_ENTITY_ID)).toBeUndefined()
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
})
