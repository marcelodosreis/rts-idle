import { tilesToFixed } from '@rts/shared'
import { createSimulation, Position, type SimulationEvent } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithCombatUnits } from '../fixtures/index.js'

function attackSetup() {
  const world = worldWithCombatUnits([0, 1])
  const ids = world.aliveIds()
  world.store(Position).set(ids[0]!, { x: 0, y: 0 })
  world.store(Position).set(ids[1]!, { x: tilesToFixed(1), y: 0 })
  const sim = createSimulation({ seed: SEEDS.simulation.fixedTick, identity: TEST_IDENTITY, initialWorld: world })
  return { sim, ids }
}

describe('per-tick simulation events (V7)', () => {
  it('returns an empty event list on a quiet tick', () => {
    const { sim } = attackSetup()
    expect(sim.step().events).toEqual([])
  })

  it('emits attackFired and damageDealt in the attack tick', () => {
    const { sim, ids } = attackSetup()
    const [attacker, target] = ids
    const result = sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [attacker], targetId: target } }
      }
    ])

    const types = result.events.map((event) => event.type)
    expect(types).toEqual(expect.arrayContaining(['attackFired', 'damageDealt']))
    expect(result.events.filter((event) => event.type === 'damageDealt')).toEqual([
      { type: 'damageDealt', targetId: target, amount: 10, targetHp: 90 }
    ])
  })

  it('keeps events out of the canonical state (transient only)', () => {
    const { sim, ids } = attackSetup()
    const [attacker, target] = ids
    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [attacker], targetId: target } }
      }
    ])

    // inspectState round-trips through the canonical snapshot; events must not
    // survive it, because they are derived per tick (master plan §23.2).
    expect(sim.inspectState().events).toEqual([])
    expect(sim.hashState()).toMatch(/^[0-9a-f]{64}$/)
  })

  it('clears events between ticks', () => {
    const { sim, ids } = attackSetup()
    const [attacker, target] = ids
    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [attacker], targetId: target } }
      }
    ])
    const second = sim.step([])
    expect(second.events).toEqual([])
  })

  it('supports the full event union shape', () => {
    const eventUnion: readonly SimulationEvent[] = [
      { type: 'attackFired', attackerId: 1, targetId: 2 },
      { type: 'damageDealt', targetId: 2, amount: 10, targetHp: 90 },
      { type: 'unitDied', entityId: 2, owner: 1, killerId: 1 }
    ]
    const types = eventUnion.map((event) => event.type)
    expect(types).toEqual(['attackFired', 'damageDealt', 'unitDied'])
  })
})
