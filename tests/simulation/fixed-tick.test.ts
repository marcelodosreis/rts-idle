import { createSimulation } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../fixtures/index.js'

describe('fixed timestep engine', () => {
  it('advances exactly one tick per step call', () => {
    const sim = createSimulation({ seed: SEEDS.simulation.fixedTick, identity: TEST_IDENTITY })
    expect(sim.exportSnapshot().tick).toBe(0)

    expect(sim.step().tick).toBe(1)
    expect(sim.step().tick).toBe(2)
    expect(sim.exportSnapshot().tick).toBe(2)
  })

  it('is deterministic across separate instances with the same seed', () => {
    const a = createSimulation({ seed: SEEDS.simulation.deterministicPair, identity: TEST_IDENTITY })
    const b = createSimulation({ seed: SEEDS.simulation.deterministicPair, identity: TEST_IDENTITY })
    for (let i = 0; i < 100; i += 1) {
      a.step()
      b.step()
      expect(a.hashState()).toBe(b.hashState())
    }
  })

  it('produces identical hashes for identical seeds and diverges for different seeds', () => {
    const a = createSimulation({ seed: SEEDS.simulation.divergenceA, identity: TEST_IDENTITY })
    const b = createSimulation({ seed: SEEDS.simulation.divergenceA, identity: TEST_IDENTITY })
    const c = createSimulation({ seed: SEEDS.simulation.divergenceB, identity: TEST_IDENTITY })
    a.step()
    b.step()
    c.step()
    expect(a.hashState()).toBe(b.hashState())
    expect(a.hashState()).not.toBe(c.hashState())
  })
})
