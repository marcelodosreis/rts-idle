import { createSimulation, deserializeState, simulationFromSnapshot } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../fixtures/index.js'

describe('state serialization roundtrip', () => {
  it('produces identical hashes for identical snapshots', () => {
    const a = createSimulation({ seed: SEEDS.simulation.snapshotIdentical, identity: TEST_IDENTITY })
    const b = createSimulation({ seed: SEEDS.simulation.snapshotIdentical, identity: TEST_IDENTITY })
    a.step()
    b.step()
    expect(a.exportSnapshot().hash).toBe(b.exportSnapshot().hash)
  })

  it('round-trips serialize/deserialize without changing the hash', () => {
    const sim = createSimulation({ seed: SEEDS.simulation.snapshotRoundtrip, identity: TEST_IDENTITY })
    sim.step()
    sim.step()
    const before = sim.hashState()
    const snapshot = sim.exportSnapshot()
    const restored = simulationFromSnapshot(snapshot)
    expect(restored.hashState()).toBe(before)
    expect(restored.exportSnapshot().tick).toBe(snapshot.tick)
  })

  it('restores a state that continues identically', () => {
    const a = createSimulation({ seed: SEEDS.simulation.snapshotContinue, identity: TEST_IDENTITY })
    a.step()
    a.step()
    a.step()
    const snapshot = a.exportSnapshot()
    const b = simulationFromSnapshot(snapshot)

    for (let i = 0; i < 50; i += 1) {
      expect(b.hashState()).toBe(a.hashState())
      a.step()
      b.step()
    }
  })

  it('rejects truncated or corrupt bytes', () => {
    const sim = createSimulation({ seed: SEEDS.simulation.snapshotCorrupt, identity: TEST_IDENTITY })
    const bytes = sim.exportSnapshot().bytes
    expect(() => deserializeState(bytes.subarray(0, 3))).toThrow()
  })
})
