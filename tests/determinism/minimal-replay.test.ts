import { createSimulation, simulationFromSnapshot } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../fixtures/index.js'

describe('minimal headless replay', () => {
  it('reproduces identical per-tick hashes from seed + commands', () => {
    const original = createSimulation({ seed: SEEDS.determinism.replayPerTick, identity: TEST_IDENTITY })
    const replayed = createSimulation({ seed: SEEDS.determinism.replayPerTick, identity: TEST_IDENTITY })

    for (let tick = 0; tick < 500; tick += 1) {
      expect(replayed.hashState()).toBe(original.hashState())
      original.step()
      replayed.step()
    }
  })

  it('replays a saved snapshot forward identically', () => {
    const original = createSimulation({ seed: SEEDS.determinism.replaySnapshot, identity: TEST_IDENTITY })
    for (let i = 0; i < 200; i += 1) {
      original.step()
    }
    const snapshot = original.exportSnapshot()
    const replayed = simulationFromSnapshot(snapshot)

    for (let tick = 0; tick < 300; tick += 1) {
      expect(replayed.hashState()).toBe(original.hashState())
      original.step()
      replayed.step()
    }
    expect(replayed.exportSnapshot().tick).toBe(500)
  })
})
