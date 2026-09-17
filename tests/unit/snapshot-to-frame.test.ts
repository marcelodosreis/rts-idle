import { describe, expect, it } from 'vitest'
import { snapshotToFrame } from '../../apps/web/src/client/snapshot-to-frame.js'

describe('snapshot to frame mapping', () => {
  it('maps a snapshot message to a render frame', () => {
    const frame = snapshotToFrame({
      type: 'snapshot',
      tick: 3,
      units: [
        { id: 1, x: 100, y: 200, owner: 0 },
        { id: 2, x: 300, y: 400, owner: 1 }
      ]
    })
    expect(frame.tick).toBe(3)
    expect(frame.units).toEqual([
      { id: 1, x: 100, y: 200, owner: 0 },
      { id: 2, x: 300, y: 400, owner: 1 }
    ])
  })

  it('maps an empty snapshot', () => {
    expect(snapshotToFrame({ type: 'snapshot', tick: 0, units: [] })).toEqual({ tick: 0, units: [] })
  })
})
