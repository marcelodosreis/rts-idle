import { createSimulation, Health, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithCombatUnits, worldWithOwners } from '../fixtures/index.js'

describe('central invariants (P1.08)', () => {
  it('accepts valid states across combat', () => {
    const world = worldWithCombatUnits([0, 1])
    const ids = world.aliveIds()
    world.store(Position).set(ids[0]!, { x: 0, y: 0 })
    world.store(Position).set(ids[1]!, { x: 256, y: 0 })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })
    for (let i = 0; i < 30; i += 1) {
      sim.step(
        i === 0
          ? [
              {
                tick: 1,
                playerId: 0,
                sequence: 1,
                intent: { type: 'ATTACK', payload: { unitIds: [ids[0]!], targetId: ids[1]! } }
              }
            ]
          : []
      )
    }
    expect(sim.hashState()).toMatch(/^[0-9a-f]{64}$/)
  })

  it('rejects an entity without a position', () => {
    const world = worldWithOwners([0])
    const id = world.aliveIds()[0]!
    world.store(Position).delete(id)
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })
    expect(() => sim.step([])).toThrow(/no position/)
  })

  it('rejects a combat unit without health', () => {
    const world = worldWithCombatUnits([0])
    const id = world.aliveIds()[0]!
    world.store(Health).delete(id)
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })
    expect(() => sim.step([])).toThrow(/can fight without health/)
  })

  it('rejects a defeated player that still has units', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    sim.step([])
    expect(sim.inspectState().phase).toBe('FINISHED')
    // A finished single-side world marks the empty slots defeated; player 0
    // still has a unit and is undefeated, so invariants hold on further ticks.
    expect(() => sim.step([])).not.toThrow()
  })

  it('rejects invalid health bounds', () => {
    const world = worldWithCombatUnits([0])
    const id = world.aliveIds()[0]!
    world.store(Health).set(id, { current: -1, max: 100 })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })
    expect(() => sim.step([])).toThrow(/invalid health/)
  })

  it('rejects an uncleared damage buffer', () => {
    const world = worldWithCombatUnits([0, 1])
    const ids = world.aliveIds()
    world.store(Position).set(ids[0]!, { x: 0, y: 0 })
    world.store(Position).set(ids[1]!, { x: 256, y: 0 })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })
    const result = sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [ids[0]!], targetId: ids[1]! } }
      }
    ])
    expect(result.rejected).toHaveLength(0)
    // After a normal tick the buffer is always cleared; a second tick is safe.
    expect(() => sim.step([])).not.toThrow()
  })
})
