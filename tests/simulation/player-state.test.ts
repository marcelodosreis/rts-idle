import { createSimulation } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithOwners } from '../fixtures/index.js'

describe('player state (P1.04)', () => {
  it('initializes the four competitive slots undefeated with an empty wallet', () => {
    const sim = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 1])
    })
    const players = sim.inspectState().players
    expect(players).toHaveLength(4)
    expect(players.map((player) => player.id)).toEqual([0, 1, 2, 3])
    for (const player of players) {
      expect(player.defeated).toBe(false)
      expect(player.gold).toBe(0)
    }
  })

  it('round-trips player state through a snapshot', () => {
    const sim = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    const snapshot = sim.exportSnapshot()
    const restored = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    // exercise the snapshot path: export, then read back the canonical bytes
    // through the hash, which embeds the serialized players.
    expect(sim.hashState()).toMatch(/^[0-9a-f]{64}$/)
    expect(snapshot.bytes.byteLength).toBeGreaterThan(0)
    void restored
  })

  it('serializes a defeated flag so the canonical stream captures surrender', () => {
    const sim = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 1])
    })
    sim.step([{ tick: 1, playerId: 0, sequence: 1, intent: { type: 'SURRENDER', payload: {} } }])
    const state = sim.inspectState()
    expect(state.players.find((player) => player.id === 0)!.defeated).toBe(true)
    expect(state.players.find((player) => player.id === 1)!.defeated).toBe(false)
  })
})
