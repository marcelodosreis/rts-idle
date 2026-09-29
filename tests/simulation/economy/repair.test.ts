import { START_ENTITY_ID } from '@rts/shared'
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

const WORKER_ID = START_ENTITY_ID
const TARGET_ID = START_ENTITY_ID + 1
const OTHER_UNIT_ID = START_ENTITY_ID + 2
const BUILDING_ID = START_ENTITY_ID + 3

function scenario(gold = 10, targetHp = 50, buildingHp = 500) {
  const world = createWorld()
  for (const id of [WORKER_ID, TARGET_ID, OTHER_UNIT_ID]) {
    world.createEntity(id)
    world.store(Position).set(id, { x: 0, y: 0 })
    world.store(Owner).set(id, { owner: 0 })
  }
  world.store(Kind).set(WORKER_ID, 'pawn')
  world.store(Kind).set(TARGET_ID, 'warrior')
  world.store(Kind).set(OTHER_UNIT_ID, 'warrior')
  world.store(Health).set(WORKER_ID, { current: 100, max: 100 })
  world.store(Health).set(TARGET_ID, { current: targetHp, max: 100 })
  world.store(Health).set(OTHER_UNIT_ID, { current: 100, max: 100 })
  world.createEntity(BUILDING_ID)
  world.store(Position).set(BUILDING_ID, { x: 0, y: 0 })
  world.store(Owner).set(BUILDING_ID, { owner: 0 })
  world.store(Building).set(BUILDING_ID, {
    buildingType: 'BASE',
    status: 'COMPLETED',
    progressTicks: 100,
    totalTicks: 100,
    builderId: null,
    footprint: { x: 0, y: 0, width: 3, height: 3 }
  })
  world.store(Health).set(BUILDING_ID, { current: buildingHp, max: 500 })
  world.createEntity(BUILDING_ID + 1)
  world.store(Position).set(BUILDING_ID + 1, { x: 8, y: 8 })
  world.store(Owner).set(BUILDING_ID + 1, { owner: 1 })
  return createSimulation({
    seed: 17,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers: [0, 1, 2, 3].map((id) => ({
      id: id as 0 | 1 | 2 | 3,
      defeated: false,
      gold: id === 0 ? gold : 0,
      usedSupply: 0,
      reservedSupply: 0,
      supplyCap: 0
    }))
  })
}

function repair(sequence: number, targetId = TARGET_ID) {
  return {
    tick: sequence,
    playerId: 0 as const,
    sequence,
    intent: { type: 'REPAIR' as const, payload: { unitIds: [OTHER_UNIT_ID, WORKER_ID], targetId } }
  }
}

describe('REPAIR simulation lifecycle', () => {
  it('chooses the lowest-id selected pawn and repairs every 10 ticks', () => {
    const sim = scenario()
    sim.step([repair(1)])
    for (let tick = 0; tick < 9; tick += 1) {
      sim.step()
    }
    const state = sim.inspectState()
    expect(state.world.store(Health).get(TARGET_ID)).toEqual({ current: 55, max: 100 })
    expect(state.players[0]?.gold).toBe(9)
    expect(state.world.store(Orders).get(WORKER_ID)?.queue[0]).toEqual({
      type: 'REPAIR',
      targetId: TARGET_ID,
      progressTicks: 0
    })
    expect(state.world.store(Orders).get(OTHER_UNIT_ID)).toBeUndefined()
  })

  it('charges one mineral for a partial final repair', () => {
    const sim = scenario(1, 98)
    sim.step([repair(1)])
    for (let tick = 0; tick < 9; tick += 1) {
      sim.step()
    }
    expect(sim.inspectState().world.store(Health).get(TARGET_ID)).toEqual({ current: 100, max: 100 })
    expect(sim.inspectState().players[0]?.gold).toBe(0)
    expect(sim.inspectState().world.store(Orders).get(WORKER_ID)).toBeUndefined()
  })

  it('stops without free healing when the player has no minerals', () => {
    const sim = scenario(0)
    sim.step([repair(1)])
    let result = sim.step()
    for (let tick = 0; tick < 8; tick += 1) {
      result = sim.step()
    }
    expect(sim.inspectState().world.store(Health).get(TARGET_ID)).toEqual({ current: 50, max: 100 })
    expect(sim.inspectState().world.store(Orders).get(WORKER_ID)).toBeUndefined()
    expect(result.events).toEqual([
      { type: 'repairStopped', workerId: WORKER_ID, targetId: TARGET_ID, reason: 'NO_MINERALS' }
    ])
  })

  it('rejects a second active repairer for the same target', () => {
    const sim = scenario()
    sim.step([repair(1)])
    const result = sim.step([
      { ...repair(2), intent: { type: 'REPAIR', payload: { unitIds: [WORKER_ID], targetId: TARGET_ID } } }
    ])
    expect(result.rejected[0]?.message).toContain('already has an active repairer')
  })

  it('repairs a completed mechanical building', () => {
    const sim = scenario(10, 50, 250)
    sim.step([repair(1, BUILDING_ID)])
    for (let tick = 0; tick < 9; tick += 1) {
      sim.step()
    }
    expect(sim.inspectState().world.store(Health).get(BUILDING_ID)).toEqual({ current: 255, max: 500 })
  })

  it('continues repair deterministically after snapshot restore', () => {
    const first = scenario()
    first.step([repair(1)])
    const second = simulationFromSnapshot(first.exportSnapshot())
    for (let tick = 0; tick < 20; tick += 1) {
      first.step()
      second.step()
    }
    expect(second.hashState()).toBe(first.hashState())
  })
})
