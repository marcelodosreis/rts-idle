import { isCommandMessage } from '@rts/protocol'
import { START_ENTITY_ID } from '@rts/shared'
import { Building, createSimulation, createWorld, Kind, Orders, Owner, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../fixtures/index.js'

function simulation(kind: 'pawn' | 'warrior' = 'pawn', owner = 0, gold = 100) {
  const world = createWorld()
  world.createEntity(START_ENTITY_ID)
  world.store(Position).set(START_ENTITY_ID, { x: 0, y: 0 })
  world.store(Owner).set(START_ENTITY_ID, { owner })
  world.store(Kind).set(START_ENTITY_ID, kind)
  // A surviving opponent keeps the match RUNNING across several ticks.
  world.createEntity(START_ENTITY_ID + 1)
  world.store(Position).set(START_ENTITY_ID + 1, { x: 10 * 256, y: 10 * 256 })
  world.store(Owner).set(START_ENTITY_ID + 1, { owner: 1 })
  world.store(Kind).set(START_ENTITY_ID + 1, 'warrior')
  return createSimulation({
    seed: 1,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers: [0, 1, 2, 3].map((id) => ({
      id: id as 0 | 1 | 2 | 3,
      defeated: false,
      resources: { GOLD: id === 0 ? gold : 0, WOOD: 0 }
    }))
  })
}

const BUILDING_ID = START_ENTITY_ID + 2

const build = (unitId: number, sequence = 1) => ({
  tick: 1,
  playerId: 0,
  sequence,
  intent: { type: 'BUILD' as const, payload: { unitId, buildingType: 'CASTLE' as const, x: 0, y: 0 } }
})

const cancel = (buildingId: number, sequence = 2, playerId = 0) => ({
  tick: 2,
  playerId,
  sequence,
  intent: { type: 'CANCEL_CONSTRUCTION' as const, payload: { buildingId } }
})

describe('CANCEL_CONSTRUCTION command contract', () => {
  it('accepts the authoritative wire shape and rejects fractional ids', () => {
    expect(
      isCommandMessage({ type: 'command', intent: { type: 'CANCEL_CONSTRUCTION', payload: { buildingId: 1 } } })
    ).toBe(true)
    expect(
      isCommandMessage({ type: 'command', intent: { type: 'CANCEL_CONSTRUCTION', payload: { buildingId: 1.5 } } })
    ).toBe(false)
    expect(isCommandMessage({ type: 'command', intent: { type: 'CANCEL_CONSTRUCTION', payload: {} } })).toBe(false)
  })

  it('rejects an unknown or unowned building atomically', () => {
    const sim = simulation()
    sim.step([build(START_ENTITY_ID)])
    const buildingId = BUILDING_ID
    const control = simulation()
    control.step([build(START_ENTITY_ID)])
    control.step()
    expect(sim.step([cancel(999)]).rejected[0]?.code).toBe('ENTITY_UNAVAILABLE')
    expect(sim.hashState()).toBe(control.hashState())
    expect(sim.step([cancel(buildingId, 3, 1)]).rejected[0]?.code).toBe('NOT_OWNER')
  })

  it('refunds 75% and removes the foundation and builder order', () => {
    const sim = simulation()
    const buildingId = BUILDING_ID
    sim.step([build(START_ENTITY_ID)])
    expect(sim.inspectState().players[0]?.resources.GOLD).toBe(0)
    const result = sim.step([cancel(buildingId)])
    const state = sim.inspectState()
    expect(result.rejected).toEqual([])
    expect(state.players[0]?.resources.GOLD).toBe(75)
    expect(state.world.store(Building).has(buildingId)).toBe(false)
    const builderOrder = state.world.store(Orders).get(START_ENTITY_ID)?.queue[0]
    expect(builderOrder?.type).not.toBe('BUILD')
  })

  it('rejects cancelling a completed building', () => {
    const sim = simulation()
    const buildingId = BUILDING_ID
    sim.step([build(START_ENTITY_ID)])
    for (let i = 0; i < 150; i += 1) {
      sim.step()
    }
    expect(sim.inspectState().world.store(Building).get(buildingId)?.status).toBe('COMPLETED')
    expect(sim.step([cancel(buildingId)]).rejected[0]?.code).toBe('INVALID_STATE')
  })
})

describe('CANCEL_PRODUCTION command contract', () => {
  it('accepts integer producer and queue index values only', () => {
    expect(
      isCommandMessage({
        type: 'command',
        intent: { type: 'CANCEL_PRODUCTION', payload: { producerId: 1, queueIndex: 0 } }
      })
    ).toBe(true)
    expect(
      isCommandMessage({
        type: 'command',
        intent: { type: 'CANCEL_PRODUCTION', payload: { producerId: 1.5, queueIndex: 0 } }
      })
    ).toBe(false)
    expect(
      isCommandMessage({
        type: 'command',
        intent: { type: 'CANCEL_PRODUCTION', payload: { producerId: 1, queueIndex: -1.5 } }
      })
    ).toBe(false)
  })
})
