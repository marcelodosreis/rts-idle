import {
  createSimulation,
  Movement,
  OrderQueue,
  Owner,
  type SimulationHost,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { buildMoveCommand, buildSurrenderCommand, SEEDS, TEST_IDENTITY, worldWithOwners } from '../fixtures/index.js'

describe('player state', () => {
  it('initializes four player slots with the baseline wallet', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 1])
    })
    const players = sim.inspectState().players
    expect(players).toHaveLength(4)
    for (const player of players) {
      expect(player.mineral).toBe(400)
      expect(player.energy).toBe(0)
      expect(player.supplyUsed).toBe(0)
      expect(player.defeated).toBe(false)
    }
  })

  it('applies per-slot overrides for fixtures', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0]),
      players: [{ mineral: 100, supplyCap: 15 }]
    })
    const players = sim.inspectState().players
    expect(players[0]).toMatchObject({ mineral: 100, supplyCap: 15 })
    expect(players[1]!.mineral).toBe(400)
  })

  it('survives snapshot roundtrip with the same values', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 2]),
      players: [{ energy: 25 }, { mineral: 999 }]
    })
    sim.step()
    const restored: SimulationHost = simulationFromSnapshot(sim.exportSnapshot())
    expect(restored.inspectState().players).toEqual(sim.inspectState().players)
    expect(restored.hashState()).toBe(sim.hashState())
  })

  it('SURRENDER marks the player defeated and deactivates their units', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 1, 1])
    })
    const ids = sim.inspectState().world.aliveIds()
    const enemyUnit = ids.find((id) => sim.inspectState().world.store(Owner).get(id)?.owner === 1)!

    sim.step([buildMoveCommand([enemyUnit], 10_000, 10_000, { playerId: 1 })])
    sim.step()

    const result = sim.step([buildSurrenderCommand({ playerId: 1 })])

    expect(result.rejected).toHaveLength(0)
    const after = sim.inspectState()
    expect(after.players[1]!.defeated).toBe(true)
    expect(after.world.store(OrderQueue).get(enemyUnit)).toBeUndefined()
    expect(after.world.store(Movement).get(enemyUnit)).toBeUndefined()
  })

  it('a defeated player cannot issue further commands', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([1])
    })
    const unit = sim.inspectState().world.aliveIds()[0]!

    sim.step([buildSurrenderCommand({ playerId: 1 })])
    const result = sim.step([buildMoveCommand([unit], 5_000, 5_000, { playerId: 1 })])

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.code).toBe('INVALID_PHASE')
  })
})
