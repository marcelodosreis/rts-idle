import { describe, expect, it } from 'vitest'
import { snapshotToFrame } from '../../apps/web/src/client/snapshot-to-frame.js'

describe('snapshot to frame mapping', () => {
  it('maps a snapshot message to a render frame', () => {
    const frame = snapshotToFrame({
      type: 'snapshot',
      tick: 3,
      phase: 'RUNNING',
      units: [
        { id: 1, x: 100, y: 200, owner: 0, kind: 'pawn', hp: 90, maxHp: 100, orderState: 'attacking' },
        { id: 2, x: 300, y: 400, owner: 1 }
      ],
      players: [
        { id: 0, defeated: false, gold: 0 },
        { id: 1, defeated: true, gold: 5 }
      ],
      events: [{ type: 'damageDealt', targetId: 1, amount: 10, targetHp: 90 }]
    })
    expect(frame.tick).toBe(3)
    expect(frame.units).toEqual([
      { id: 1, x: 100, y: 200, owner: 0, kind: 'pawn', hp: 90, maxHp: 100 },
      { id: 2, x: 300, y: 400, owner: 1, kind: 'pawn', hp: undefined, maxHp: undefined }
    ])
    expect(frame.players).toEqual([
      { id: 0, defeated: false, gold: 0 },
      { id: 1, defeated: true, gold: 5 }
    ])
    expect(frame.events).toEqual([{ type: 'damageDealt', targetId: 1, amount: 10, targetHp: 90 }])
  })

  it('maps an empty snapshot', () => {
    expect(
      snapshotToFrame({ type: 'snapshot', tick: 0, phase: 'FINISHED', units: [], players: [], events: [] })
    ).toEqual({
      tick: 0,
      units: [],
      players: [],
      events: []
    })
  })
})
