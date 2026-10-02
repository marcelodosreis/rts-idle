import { describe, expect, it } from 'vitest'
import { runSnapshotDeltaBenchmark } from '../../../tools/benchmark/src/snapshot-delta.js'

describe('snapshot delta benchmark', () => {
  it('proves idle observation has no changed entities and one-unit work stays bounded', () => {
    const result = runSnapshotDeltaBenchmark(100, 2)

    expect(result.idleChangedEntities).toBe(0)
    expect(result.activeChangedEntities).toBe(1)
    expect(result.idleObservationMs).toBeGreaterThanOrEqual(0)
    expect(result.activeObservationMs).toBeGreaterThanOrEqual(0)
  })
})
