import { describe, expect, it } from 'vitest'
import { snapshotToFrame } from '../../../apps/web/src/features/match/projections/snapshot-to-frame.js'

describe('snapshot to frame mapping', () => {
  it('forwards the carrying flag to the render unit', () => {
    const frame = snapshotToFrame({
      type: 'snapshot',
      tick: 1,
      phase: 'RUNNING',
      units: [{ id: 1, x: 0, y: 0, owner: 0, carrying: true, cargoType: 'WOOD' }],
      buildings: [],
      resources: [],
      resourcesComplete: true,
      players: [],
      events: []
    })
    expect(frame.units[0]!.carrying).toBe(true)
    expect(frame.units[0]!.cargoType).toBe('WOOD')
  })

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
            phase: 'harvesting',
            cargoAmount: 3,
            cargoCapacity: 10,
            progressTicks: 12,
            progressMax: 200,
            resourceId: 4
          }
        },
        { id: 2, x: 300, y: 400, owner: 1 }
      ],
      buildings: [
        {
          id: 5,
          buildingType: 'CASTLE',
          x: 768,
          y: 1024,
          owner: 0,
          footprint: { width: 2, height: 2 },
          status: 'FOUNDATION',
          progressTicks: 0,
          totalTicks: 100,
          production: {
            queue: [
              {
                unitKind: 'WARRIOR',
                cost: { GOLD: 50 },
                reservedSupply: 1,
                progressTicks: 12,
                totalTicks: 60,
                status: 'ACTIVE'
              }
            ]
          }
        }
      ],
      resources: [{ resourceId: 4, remaining: 25 }],
      resourcesComplete: true,
      players: [
        { id: 0, defeated: false, resources: { GOLD: 0, WOOD: 0 }, usedSupply: 2, supplyCap: 10 },
        { id: 1, defeated: true, resources: { GOLD: 5, WOOD: 0 }, usedSupply: 0, supplyCap: 0 }
      ],
      events: [{ type: 'damageDealt', targetId: 1, amount: 10, targetHp: 90 }]
    })
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
          phase: 'harvesting',
          cargoAmount: 3,
          cargoCapacity: 10,
          progressTicks: 12,
          progressMax: 200,
          resourceId: 4
        }
      },
      { id: 2, x: 300, y: 400, owner: 1, kind: 'pawn', hp: undefined, maxHp: undefined, orderState: undefined }
    ])
    expect(frame.buildings).toEqual([
      {
        id: 5,
        buildingType: 'CASTLE',
        x: 768,
        y: 1024,
        owner: 0,
        footprint: { width: 2, height: 2 },
        status: 'FOUNDATION',
        progressTicks: 0,
        totalTicks: 100,
        production: {
          queue: [
            {
              unitKind: 'WARRIOR',
              cost: { GOLD: 50 },
              reservedSupply: 1,
              progressTicks: 12,
              totalTicks: 60,
              status: 'ACTIVE'
            }
          ]
        }
      }
    ])
    expect(frame.resources).toEqual([{ resourceId: 4, remaining: 25 }])
    expect(frame.events).toEqual([{ type: 'damageDealt', targetId: 1, amount: 10, targetHp: 90 }])
  })

  it('forwards Castle tier upgrade progress to the renderer', () => {
    const frame = snapshotToFrame({
      type: 'snapshot',
      tick: 4,
      phase: 'RUNNING',
      units: [],
      buildings: [
        {
          id: 5,
          buildingType: 'CASTLE',
          x: 0,
          y: 0,
          owner: 0,
          footprint: { width: 2, height: 2 },
          status: 'COMPLETED',
          tier: 1,
          tierUpgrade: { progressTicks: 40, totalTicks: 100 },
          progressTicks: 100,
          totalTicks: 100
        }
      ],
      resources: [],
      resourcesComplete: true,
      players: [],
      events: []
    })

    expect(frame.buildings?.[0]).toMatchObject({
      tier: 1,
      tierUpgrade: { progressTicks: 40, totalTicks: 100 }
    })
  })

  it('maps an empty snapshot', () => {
    expect(
      snapshotToFrame({
        type: 'snapshot',
        tick: 0,
        phase: 'FINISHED',
        units: [],
        buildings: [],
        resources: [],
        resourcesComplete: true,
        players: [],
        events: []
      })
    ).toEqual({
      tick: 0,
      units: [],
      buildings: [],
      resources: [],
      events: []
    })
  })
})
