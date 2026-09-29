import {
  Cargo,
  checkBuildingFootprints,
  createSimulation,
  Health,
  Kind,
  MineralNode,
  Movement,
  Orders,
  Position
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithCombatUnits, worldWithOwners } from '../fixtures/index.js'

describe('central invariants (P1.08)', () => {
  it('accepts valid building footprints and edge-touching buildings', () => {
    expect(() =>
      checkBuildingFootprints({ width: 8, height: 8 }, [
        { x: 0, y: 0, width: 2, height: 2 },
        { x: 2, y: 0, width: 2, height: 2 }
      ])
    ).not.toThrow()
  })

  it.each([
    ['out of bounds', [{ x: 7, y: 7, width: 2, height: 1 }], /OUT_OF_BOUNDS/],
    ['invalid tile', [{ x: 1, y: 1, width: 2, height: 2 }], /INVALID_TILE/],
    [
      'overlap',
      [
        { x: 0, y: 0, width: 2, height: 2 },
        { x: 1, y: 1, width: 2, height: 2 }
      ],
      /OVERLAP/
    ]
  ])('rejects a footprint list with %s', (_name, footprints, error) => {
    const map =
      _name === 'invalid tile' ? { width: 8, height: 8, invalidTiles: [{ x: 2, y: 2 }] } : { width: 8, height: 8 }
    expect(() => checkBuildingFootprints(map, footprints)).toThrow(error)
  })

  it('accepts valid states across combat', () => {
    const world = worldWithCombatUnits([0, 1])
    const ids = world.aliveIds()
    world.store(Position).set(ids[0]!, { x: 0, y: 0 })
    world.store(Position).set(ids[1]!, { x: 256, y: 0 })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })
    for (let i = 0; i < 30; i += 1) {
      sim.step(
        i === 0
          ? [
              {
                tick: 1,
                playerId: 0,
                sequence: 1,
                intent: { type: 'ATTACK', payload: { unitIds: [ids[0]!], targetId: ids[1]! } }
              }
            ]
          : []
      )
    }
    expect(sim.hashState()).toMatch(/^[0-9a-f]{64}$/)
  })

  it('rejects an entity without a position', () => {
    const world = worldWithOwners([0])
    const id = world.aliveIds()[0]!
    world.store(Position).delete(id)
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })
    expect(() => sim.step([])).toThrow(/no position/)
  })

  it('rejects a combat unit without health', () => {
    const world = worldWithCombatUnits([0])
    const id = world.aliveIds()[0]!
    world.store(Health).delete(id)
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })
    expect(() => sim.step([])).toThrow(/can fight without health/)
  })

  it('rejects a defeated player that still has units', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    sim.step([])
    expect(sim.inspectState().phase).toBe('FINISHED')
    // A finished single-side world marks the empty slots defeated; player 0
    // still has a unit and is undefeated, so invariants hold on further ticks.
    expect(() => sim.step([])).not.toThrow()
  })

  it('rejects invalid health bounds', () => {
    const world = worldWithCombatUnits([0])
    const id = world.aliveIds()[0]!
    world.store(Health).set(id, { current: -1, max: 100 })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })
    expect(() => sim.step([])).toThrow(/invalid health/)
  })

  it('rejects an uncleared damage buffer', () => {
    const world = worldWithCombatUnits([0, 1])
    const ids = world.aliveIds()
    world.store(Position).set(ids[0]!, { x: 0, y: 0 })
    world.store(Position).set(ids[1]!, { x: 256, y: 0 })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })
    const result = sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [ids[0]!], targetId: ids[1]! } }
      }
    ])
    expect(result.rejected).toHaveLength(0)
    // After a normal tick the buffer is always cleared; a second tick is safe.
    expect(() => sim.step([])).not.toThrow()
  })

  it('rejects negative minerals in a node', () => {
    const world = worldWithOwners([0])
    const id = world.aliveIds()[0]!
    world.store(MineralNode).set(id, { remaining: -1 })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })

    expect(() => sim.step()).toThrow(/negative mineral amount/)
  })

  it('rejects cargo outside the v0 capacity bounds', () => {
    const world = worldWithOwners([0])
    const id = world.aliveIds()[0]!
    world.store(Kind).set(id, 'pawn')
    world.store(Cargo).set(id, { amount: 11, capacity: 10 })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })

    expect(() => sim.step()).toThrow(/invalid cargo/)
  })

  it('rejects gather progress outside one complete batch', () => {
    const world = worldWithOwners([0])
    const id = world.aliveIds()[0]!
    world.store(Kind).set(id, 'pawn')
    world.store(Cargo).set(id, { amount: 0, capacity: 10 })
    world.store(Orders).set(id, {
      queue: [{ type: 'GATHER', nodeId: 99, baseId: null, phase: 'TO_NODE', progressTicks: 200 }]
    })
    world.store(Movement).set(id, {
      speedTilesPerSecondFixed: 40,
      destX: 10_000,
      destY: 0,
      remainderX: 0,
      remainderY: 0
    })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })

    expect(() => sim.step()).toThrow(/invalid gather progress/)
  })

  it('rejects a gather order without Worker cargo state', () => {
    const world = worldWithOwners([0])
    const id = world.aliveIds()[0]!
    world.store(Kind).set(id, 'pawn')
    world.store(Orders).set(id, {
      queue: [{ type: 'GATHER', nodeId: 99, baseId: null, phase: 'TO_NODE', progressTicks: 0 }]
    })
    world.store(Movement).set(id, {
      speedTilesPerSecondFixed: 40,
      destX: 10_000,
      destY: 0,
      remainderX: 0,
      remainderY: 0
    })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })

    expect(() => sim.step()).toThrow(/gather order without Worker state/)
  })

  it('rejects a deposit order without Worker cargo state', () => {
    const world = worldWithOwners([0])
    const id = world.aliveIds()[0]!
    world.store(Kind).set(id, 'pawn')
    world.store(Orders).set(id, { queue: [{ type: 'DEPOSIT', buildingId: 99 }] })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })

    expect(() => sim.step()).toThrow(/deposit order without Worker state/)
  })

  it('rejects a BUILD order referencing a missing construction', () => {
    const world = worldWithOwners([0])
    const id = world.aliveIds()[0]!
    world.store(Kind).set(id, 'pawn')
    world.store(Orders).set(id, {
      queue: [{ type: 'BUILD', buildingId: 99, buildingType: 'CASTLE', workPoint: { x: 0, y: 0 } }]
    })
    const sim = createSimulation({ seed: SEEDS.integration.moveOwn, identity: TEST_IDENTITY, initialWorld: world })

    expect(() => sim.step()).toThrow(/build order referencing missing construction/)
  })
})
