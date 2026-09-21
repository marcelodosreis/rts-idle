import { isCommandMessage } from '@rts/protocol'
import { START_ENTITY_ID } from '@rts/shared'
import { Building, createSimulation, createWorld, Kind, Owner, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../fixtures/index.js'

const command = (unitId: number, x = 0, y = 0) => ({
  tick: 1,
  playerId: 0,
  sequence: 1,
  intent: { type: 'BUILD' as const, payload: { unitId, buildingType: 'BASE' as const, x, y } }
})

function simulation(kind: 'pawn' | 'warrior' = 'pawn', owner = 0, gold = 100) {
  const world = createWorld()
  world.createEntity(START_ENTITY_ID)
  world.store(Position).set(START_ENTITY_ID, { x: 0, y: 0 })
  world.store(Owner).set(START_ENTITY_ID, { owner })
  world.store(Kind).set(START_ENTITY_ID, kind)
  return createSimulation({
    seed: 1,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers: [0, 1, 2, 3].map((id) => ({ id: id as 0 | 1 | 2 | 3, defeated: false, gold: id === 0 ? gold : 0 }))
  })
}

describe('BUILD command contract', () => {
  it('accepts the authoritative wire shape and rejects fractional tiles', () => {
    expect(
      isCommandMessage({
        type: 'command',
        intent: { type: 'BUILD', payload: { unitId: 1, buildingType: 'BASE', x: 2, y: 3 } }
      })
    ).toBe(true)
    expect(
      isCommandMessage({
        type: 'command',
        intent: { type: 'BUILD', payload: { unitId: 1, buildingType: 'BARRACKS', x: 2, y: 3 } }
      })
    ).toBe(true)
    expect(
      isCommandMessage({
        type: 'command',
        intent: { type: 'BUILD', payload: { unitId: 1, buildingType: 'BASE', x: 2.5, y: 3 } }
      })
    ).toBe(false)
    expect(
      isCommandMessage({
        type: 'command',
        intent: { type: 'BUILD', payload: { unitId: 1, buildingType: 'TOWER', x: 2, y: 3 } }
      })
    ).toBe(false)
  })

  it('rejects invalid placement and ownership atomically', () => {
    const sim = simulation()
    const control = simulation()
    control.step()
    expect(sim.step([command(START_ENTITY_ID, 31, 31)]).rejected[0]?.code).toBe('INVALID_PLACEMENT')
    expect(sim.hashState()).toBe(control.hashState())
    expect(simulation('pawn', 1).step([command(START_ENTITY_ID)]).rejected[0]?.code).toBe('NOT_OWNER')
    expect(simulation('warrior').step([command(START_ENTITY_ID)]).rejected[0]?.code).toBe('ENTITY_UNAVAILABLE')
    expect(simulation('pawn', 0, 0).step([command(START_ENTITY_ID)]).rejected[0]?.code).toBe('INSUFFICIENT_RESOURCES')
  })

  it('creates one foundation and deducts cost once', () => {
    const sim = simulation()
    const result = sim.step([command(START_ENTITY_ID)])
    const state = sim.inspectState()
    expect(result.rejected).toEqual([])
    expect(state.players[0]?.gold).toBe(0)
    expect(state.world.store(Building).get(START_ENTITY_ID + 1)?.status).toBe('FOUNDATION')
  })

  it('creates a BARRACKS foundation with its own footprint and cost', () => {
    const sim = simulation('pawn', 0, 150)
    const result = sim.step([
      {
        ...command(START_ENTITY_ID, 4, 4),
        intent: { type: 'BUILD', payload: { unitId: START_ENTITY_ID, buildingType: 'BARRACKS', x: 4, y: 4 } }
      }
    ])
    const construction = sim
      .inspectState()
      .world.store(Building)
      .get(START_ENTITY_ID + 1)
    expect(result.rejected).toEqual([])
    expect(sim.inspectState().players[0]?.gold).toBe(0)
    expect(construction).toMatchObject({
      buildingType: 'BARRACKS',
      status: 'FOUNDATION',
      totalTicks: 100,
      footprint: { x: 4, y: 4, width: 3, height: 3 }
    })
  })
})
