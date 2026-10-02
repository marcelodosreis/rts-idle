import { type PlayerId, tilesToFixed } from '@rts/shared'
import { createSimulation, Movement, Orders, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { runUntilArrived, SEEDS, TEST_IDENTITY, worldWithOwners } from '../fixtures/index.js'

function unitSim(seed: number, owners: readonly PlayerId[]) {
  return createSimulation({
    seed,
    identity: TEST_IDENTITY,
    // Command admission now correctly rejects commands after a finished match;
    // retain an opponent so these lifecycle tests exercise running matches.
    initialWorld: worldWithOwners(owners.includes(1) ? owners : [...owners, 1])
  })
}

describe('order lifecycle (P1.03)', () => {
  it('STOP cancels movement and clears the order queue', () => {
    const sim = unitSim(SEEDS.integration.moveOwn, [0])
    const unit = sim.inspectState().world.aliveIds()[0]!
    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'PATROL', payload: { unitIds: [unit], x: tilesToFixed(4), y: 0 } }
      }
    ])
    expect(sim.inspectState().world.store(Movement).get(unit)).toBeDefined()

    const result = sim.step([
      { tick: 2, playerId: 0, sequence: 2, intent: { type: 'STOP', payload: { unitIds: [unit] } } }
    ])

    expect(result.rejected).toHaveLength(0)
    const after = sim.inspectState()
    expect(after.world.store(Movement).get(unit)).toBeUndefined()
    expect(after.world.store(Orders).get(unit)).toBeUndefined()
  })

  it('HOLD parks the unit in place with a defensive order', () => {
    const sim = unitSim(SEEDS.integration.moveOwn, [0])
    const unit = sim.inspectState().world.aliveIds()[0]!
    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'MOVE', payload: { unitIds: [unit], x: tilesToFixed(3), y: 0 } }
      }
    ])

    sim.step([{ tick: 2, playerId: 0, sequence: 2, intent: { type: 'HOLD', payload: { unitIds: [unit] } } }])

    const after = sim.inspectState()
    expect(after.world.store(Movement).get(unit)).toBeUndefined()
    expect(after.world.store(Orders).get(unit)).toEqual({ queue: [{ type: 'HOLD' }] })
  })

  it('PATROL walks to the target and returns home on the next leg', () => {
    const sim = unitSim(SEEDS.integration.moveOwn, [0])
    const unit = sim.inspectState().world.aliveIds()[0]!
    const target = tilesToFixed(2)

    sim.step([
      { tick: 1, playerId: 0, sequence: 1, intent: { type: 'PATROL', payload: { unitIds: [unit], x: target, y: 0 } } }
    ])
    runUntilArrived(sim, [unit])

    const afterFirst = sim.inspectState()
    expect(afterFirst.world.store(Position).get(unit)).toEqual({ x: target, y: 0 })
    expect(afterFirst.world.store(Orders).get(unit)).toBeDefined()

    // The next tick re-arms the return leg toward home (0,0).
    sim.step([])
    const returning = sim.inspectState()
    const movement = returning.world.store(Movement).get(unit)
    expect(movement).toBeDefined()
    expect(movement!.destX).toBe(0)
    expect(movement!.destY).toBe(0)
  })

  it('a second PATROL command replaces the first', () => {
    const sim = unitSim(SEEDS.integration.moveOwn, [0])
    const unit = sim.inspectState().world.aliveIds()[0]!
    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'PATROL', payload: { unitIds: [unit], x: tilesToFixed(2), y: 0 } }
      }
    ])

    sim.step([
      {
        tick: 2,
        playerId: 0,
        sequence: 2,
        intent: { type: 'PATROL', payload: { unitIds: [unit], x: tilesToFixed(5), y: 0 } }
      }
    ])

    const queue = sim.inspectState().world.store(Orders).get(unit)!
    expect(queue.queue[0]).toEqual({ type: 'PATROL', x: tilesToFixed(5), y: 0 })
  })

  it('MOVE replaces a standing order', () => {
    const sim = unitSim(SEEDS.integration.moveOwn, [0])
    const unit = sim.inspectState().world.aliveIds()[0]!
    sim.step([{ tick: 1, playerId: 0, sequence: 1, intent: { type: 'HOLD', payload: { unitIds: [unit] } } }])

    sim.step([
      {
        tick: 2,
        playerId: 0,
        sequence: 2,
        intent: { type: 'MOVE', payload: { unitIds: [unit], x: tilesToFixed(2), y: 0 } }
      }
    ])

    const after = sim.inspectState()
    expect(after.world.store(Orders).get(unit)).toBeUndefined()
    expect(after.world.store(Movement).get(unit)).toBeDefined()
  })

  it('is deterministic for the same PATROL seed and commands', () => {
    const build = () => unitSim(SEEDS.integration.moveDeterministic, [0])
    const a = build()
    const b = build()
    const unit = a.inspectState().world.aliveIds()[0]!
    const command = {
      tick: 1,
      playerId: 0 as const,
      sequence: 1,
      intent: { type: 'PATROL' as const, payload: { unitIds: [unit], x: tilesToFixed(3), y: tilesToFixed(3) } }
    }

    for (let i = 0; i < 60; i += 1) {
      a.step(i === 0 ? [command] : [])
      b.step(i === 0 ? [command] : [])
      expect(b.hashState()).toBe(a.hashState())
    }
  })
})
