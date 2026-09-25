import { createSimulation, Owner } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithOwners } from '../../fixtures/index.js'

const surrender = { tick: 1, playerId: 0 as const, sequence: 1, intent: { type: 'SURRENDER' as const, payload: {} } }

describe('SURRENDER and defeat', () => {
  it('marks the player defeated and disbands their units', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 0, 1, 1])
    })
    const before = sim.inspectState()
    const ownIds = before.world.aliveIds().filter((id) => before.world.store(Owner).get(id)!.owner === 0)
    const enemyIds = before.world.aliveIds().filter((id) => before.world.store(Owner).get(id)!.owner === 1)

    const result = sim.step([surrender])

    expect(result.rejected).toHaveLength(0)
    const after = sim.inspectState()
    expect(after.players.find((player) => player.id === 0)!.defeated).toBe(true)
    for (const id of ownIds) {
      expect(after.world.hasEntity(id)).toBe(false)
    }
    for (const id of enemyIds) {
      expect(after.world.hasEntity(id)).toBe(true)
    }
  })

  it('rejects a second surrender from the same player without mutating state', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    sim.step([surrender])
    const before = sim.inspectState()
    const idsBefore = before.world.aliveIds()

    const second = sim.step([surrender])
    const after = sim.inspectState()

    expect(second.rejected).toHaveLength(1)
    expect(second.rejected[0]!.code).toBe('INVALID_PHASE')
    // Only the tick advanced: the player stays defeated and the world is intact.
    expect(after.tick).toBe(before.tick + 1)
    expect(after.players.find((player) => player.id === 0)!.defeated).toBe(true)
    expect(after.world.aliveIds()).toEqual(idsBefore)
  })

  it('only the issuing player surrenders', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 1])
    })
    const other = { ...surrender, playerId: 1 as const }
    sim.step([other])
    const after = sim.inspectState()
    expect(after.players.find((player) => player.id === 1)!.defeated).toBe(true)
    expect(after.players.find((player) => player.id === 0)!.defeated).toBe(false)
  })
})
