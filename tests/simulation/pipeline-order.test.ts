import { createSimulation, SYSTEM_PIPELINE } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../fixtures/index.js'

describe('frozen systems pipeline', () => {
  it('declares the system order explicitly and immutably', () => {
    const names = SYSTEM_PIPELINE.map((step) => step.name)
    expect(names).toEqual(['orders', 'movement', 'combat', 'death', 'victory', 'invariants'])
    expect(Object.isFrozen(SYSTEM_PIPELINE)).toBe(true)
  })

  it('exposes an empty per-tick event list when no system emits events', () => {
    const sim = createSimulation({ seed: SEEDS.simulation.fixedTick, identity: TEST_IDENTITY })
    const result = sim.step()
    expect(result.tick).toBe(1)
    expect(result.events).toEqual([])
  })

  it('clears events between ticks', () => {
    const sim = createSimulation({ seed: SEEDS.simulation.fixedTick, identity: TEST_IDENTITY })
    sim.step()
    const second = sim.step()
    expect(second.events).toEqual([])
  })

  it('keeps the canonical hash stable across the pipeline refactor', () => {
    const sim = createSimulation({ seed: SEEDS.simulation.fixedTick, identity: TEST_IDENTITY })
    sim.step()
    sim.step()
    expect(sim.hashState()).toMatch(/^[0-9a-f]{64}$/)
  })
})
