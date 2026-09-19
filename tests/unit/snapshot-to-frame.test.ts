import { describe, expect, it } from 'vitest'
import { snapshotToFrame } from '../../apps/web/src/client/snapshot-to-frame.js'

describe('snapshot to frame mapping', () => {
  it('maps a snapshot message to a render frame', () => {
    const frame = snapshotToFrame({
      type: 'snapshot',
      tick: 3,
      phase: 'RUNNING',
      units: [
        {
          id: 1,
          x: 100,
          y: 200,
          owner: 0,
          kind: 'pawn',
          hp: 90,
          maxHp: 100,
          orderState: 'attacking',
          economy: {
            phase: 'gathering',
            cargoAmount: 3,
            cargoCapacity: 10,
            progressTicks: 12,
            progressMax: 20,
            nodeId: 4
          }
        },
        { id: 2, x: 300, y: 400, owner: 1 }
      ],
      bases: [{ id: 3, x: 500, y: 600, owner: 0 }],
      constructions: [
        {
          id: 5,
          buildingType: 'BASE',
          x: 768,
          y: 1024,
          owner: 0,
          footprint: { width: 2, height: 2 },
          status: 'FOUNDATION',
          progressTicks: 0,
          totalTicks: 100
        }
      ],
      mineralNodes: [{ id: 4, x: 700, y: 800, remaining: 25 }],
      players: [
        { id: 0, defeated: false, gold: 0 },
        { id: 1, defeated: true, gold: 5 }
      ],
      events: [{ type: 'damageDealt', targetId: 1, amount: 10, targetHp: 90 }]
    })
    expect(frame.tick).toBe(3)
    expect(frame.units).toEqual([
      {
        id: 1,
        x: 100,
        y: 200,
        owner: 0,
        kind: 'pawn',
        hp: 90,
        maxHp: 100,
        orderState: 'attacking',
        economy: {
          phase: 'gathering',
          cargoAmount: 3,
          cargoCapacity: 10,
          progressTicks: 12,
          progressMax: 20,
          nodeId: 4
        }
      },
      { id: 2, x: 300, y: 400, owner: 1, kind: 'pawn', hp: undefined, maxHp: undefined, orderState: undefined }
    ])
    expect(frame.bases).toEqual([{ id: 3, x: 500, y: 600, owner: 0 }])
    expect(frame.constructions).toEqual([
      {
        id: 5,
        buildingType: 'BASE',
        x: 768,
        y: 1024,
        owner: 0,
        footprint: { width: 2, height: 2 },
        status: 'FOUNDATION',
        progressTicks: 0,
        totalTicks: 100
      }
    ])
    expect(frame.mineralNodes).toEqual([{ id: 4, x: 700, y: 800, remaining: 25 }])
    expect(frame.players).toEqual([
      { id: 0, defeated: false, gold: 0 },
      { id: 1, defeated: true, gold: 5 }
    ])
    expect(frame.events).toEqual([{ type: 'damageDealt', targetId: 1, amount: 10, targetHp: 90 }])
  })

  it('maps an empty snapshot', () => {
    expect(
      snapshotToFrame({
        type: 'snapshot',
        tick: 0,
        phase: 'FINISHED',
        units: [],
        bases: [],
        mineralNodes: [],
        players: [],
        events: []
      })
    ).toEqual({
      tick: 0,
      units: [],
      bases: [],
      mineralNodes: [],
      players: [],
      events: []
    })
  })
})
