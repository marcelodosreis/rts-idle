import { createSimulation, Movement, Orders } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithOwners } from '../fixtures/index.js'

describe('command atomicity (P1.02)', () => {
  it('rejects a STOP from a non-owner without mutating state', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveNonOwner,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveNonOwner,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    const unit = sim.inspectState().world.aliveIds()[0]!

    const result = sim.step([
      { tick: 1, playerId: 1, sequence: 1, intent: { type: 'STOP', payload: { unitIds: [unit] } } }
    ])
    control.step([])

    expect(result.rejected[0]!.code).toBe('NOT_OWNER')
    expect(sim.hashState()).toBe(control.hashState())
  })

  it('rejects an ATTACK on a same-player target without mutating state', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 0])
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 0])
    })
    const units = sim.inspectState().world.aliveIds()

    const result = sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [units[0]!], targetId: units[1]! } }
      }
    ])
    control.step([])

    expect(result.rejected[0]!.code).toBe('NOT_OWNER')
    expect(sim.hashState()).toBe(control.hashState())
    expect(sim.inspectState().world.store(Orders).get(units[0]!)).toBeUndefined()
  })

  it('rejects fractional PATROL coordinates as INVALID_PAYLOAD without mutating state', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveFractional,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveFractional,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    const unit = sim.inspectState().world.aliveIds()[0]!

    const result = sim.step([
      { tick: 1, playerId: 0, sequence: 1, intent: { type: 'PATROL', payload: { unitIds: [unit], x: 10.5, y: 20 } } }
    ])
    control.step([])

    expect(result.rejected[0]!.code).toBe('INVALID_PAYLOAD')
    expect(sim.hashState()).toBe(control.hashState())
  })

  it('rejects a partial selection wholesale without mutating any unit', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveMissing,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 0])
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveMissing,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 0])
    })
    const unit = sim.inspectState().world.aliveIds()[0]!
    const commands = [
      { tick: 1, playerId: 0, sequence: 1, intent: { type: 'HOLD', payload: { unitIds: [unit, 999] } } }
    ]

    const result = sim.step(commands)
    control.step([])

    expect(result.rejected[0]!.code).toBe('ENTITY_UNAVAILABLE')
    expect(sim.hashState()).toBe(control.hashState())
    expect(sim.inspectState().world.store(Orders).get(unit)).toBeUndefined()
    expect(sim.inspectState().world.store(Movement).get(unit)).toBeUndefined()
  })
})
