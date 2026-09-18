import { createSimulation, Health, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithCombatUnits, worldWithOwners } from '../fixtures/index.js'

function singleHitWorld() {
  // Two combat units; the player-1 unit is one hit away from death.
  const world = worldWithCombatUnits([0, 1])
  const ids = world.aliveIds()
  world.store(Position).set(ids[0]!, { x: 0, y: 0 })
  world.store(Position).set(ids[1]!, { x: 256, y: 0 })
  world.store(Health).set(ids[1]!, { current: 10, max: 100 })
  return { world, ids }
}

describe('victory, draw, and tick limit (P1.07)', () => {
  it('eliminates empty slots and finishes when one player remains', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    sim.step([])
    const after = sim.inspectState()
    // Slots 1-3 never had units; player 0 alone remains → win, match finished.
    expect(after.players.filter((player) => !player.defeated)).toEqual([expect.objectContaining({ id: 0 })])
    expect(after.phase).toBe('FINISHED')
  })

  it('declares a winner when all enemies are eliminated', () => {
    const { world, ids } = singleHitWorld()
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })

    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [ids[0]!], targetId: ids[1]! } }
      }
    ])

    const after = sim.inspectState()
    expect(after.phase).toBe('FINISHED')
    expect(after.players.find((player) => player.id === 0)!.defeated).toBe(false)
    expect(after.players.find((player) => player.id === 1)!.defeated).toBe(true)
  })

  it('draws when every player is eliminated', () => {
    const world = worldWithCombatUnits([0, 1])
    const ids = world.aliveIds()
    for (const id of ids) {
      world.store(Health).set(id, { current: 10, max: 100 })
    }
    world.store(Position).set(ids[0]!, { x: 0, y: 0 })
    world.store(Position).set(ids[1]!, { x: 256, y: 0 })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })

    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [ids[0]!], targetId: ids[1]! } }
      },
      {
        tick: 1,
        playerId: 1,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [ids[1]!], targetId: ids[0]! } }
      }
    ])

    const after = sim.inspectState()
    expect(after.phase).toBe('FINISHED')
    expect(after.players.every((player) => player.defeated)).toBe(true)
  })

  it('cuts a running match off at the tick limit', () => {
    const sim = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 1])
    })
    // Two players with units keep the game running; 5000 ticks at 20/s ~ 4 min.
    for (let i = 0; i < 5100; i += 1) {
      sim.step([])
    }
    expect(sim.inspectState().phase).toBe('FINISHED')
  })

  it('decides the winner once and keeps the phase finished on later ticks', () => {
    const { world, ids } = singleHitWorld()
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })
    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [ids[0]!], targetId: ids[1]! } }
      }
    ])
    const decided = sim.inspectState()
    expect(decided.phase).toBe('FINISHED')

    // Later ticks keep the decision stable (no re-run, no winner flip).
    sim.step([])
    sim.step([])
    const later = sim.inspectState()
    expect(later.phase).toBe('FINISHED')
    expect(later.players.find((player) => player.id === 0)!.defeated).toBe(false)
    expect(later.players.find((player) => player.id === 1)!.defeated).toBe(true)
  })
})
