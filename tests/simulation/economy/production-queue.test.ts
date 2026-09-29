import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  Building,
  Cargo,
  Combat,
  createSimulation,
  createUnitEntity,
  createWorld,
  Health,
  Kind,
  Movement,
  Owner,
  Position,
  Production,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../../fixtures/index.js'

function scenario(
  gold = 250,
  options: {
    readonly withBase?: boolean
    readonly blockSpawn?: boolean
    readonly overCap?: boolean
    readonly withEnemy?: boolean
  } = {}
) {
  const world = createWorld()
  if (options.withBase !== false) {
    world.createEntity(START_ENTITY_ID)
    world.store(Position).set(START_ENTITY_ID, { x: tilesToFixed(12), y: 0 })
    world.store(Owner).set(START_ENTITY_ID, { owner: 0 })
    world.store(Building).set(START_ENTITY_ID, {
      buildingType: 'BASE',
      status: 'COMPLETED',
      progressTicks: 1,
      totalTicks: 1,
      builderId: null,
      footprint: { x: 12, y: 0, width: 2, height: 2 }
    })
  }
  world.createEntity(START_ENTITY_ID + 1)
  world.store(Position).set(START_ENTITY_ID + 1, { x: 0, y: 0 })
  world.store(Owner).set(START_ENTITY_ID + 1, { owner: 0 })
  world.store(Building).set(START_ENTITY_ID + 1, {
    buildingType: 'BARRACKS',
    status: 'COMPLETED',
    progressTicks: BUILDING_DEFINITIONS.BARRACKS.constructionTicks,
    totalTicks: BUILDING_DEFINITIONS.BARRACKS.constructionTicks,
    builderId: null,
    footprint: { x: 0, y: 0, width: 3, height: 3 }
  })
  if (options.blockSpawn) {
    const blockerId = START_ENTITY_ID + 10
    world.createEntity(blockerId)
    world.store(Position).set(blockerId, { x: tilesToFixed(3), y: 0 })
    world.store(Owner).set(blockerId, { owner: 0 })
    world.store(Kind).set(blockerId, 'pawn')
    world.store(Health).set(blockerId, { current: 100, max: 100 })
    world.store(Combat).set(blockerId, { damage: 10, rangeTiles: 1, cooldownTicks: 20, cooldownRemaining: 0 })
  }
  if (options.withEnemy) {
    createUnitEntity(world, {
      id: START_ENTITY_ID + 100,
      x: tilesToFixed(20),
      y: tilesToFixed(20),
      owner: 1,
      kind: 'pawn'
    })
  }
  if (options.overCap) {
    world.store(Production).set(START_ENTITY_ID + 1, {
      queue: [
        {
          unitKind: 'warrior',
          costMinerals: 100,
          reservedSupply: 1,
          progressTicks: 0,
          totalTicks: 200,
          status: 'ACTIVE'
        }
      ]
    })
    for (let index = 0; index < 10; index += 1) {
      const id = START_ENTITY_ID + 20 + index
      world.createEntity(id)
      world.store(Position).set(id, { x: tilesToFixed(6 + index), y: tilesToFixed(6) })
      world.store(Owner).set(id, { owner: 0 })
      world.store(Kind).set(id, 'warrior')
      world.store(Health).set(id, { current: 150, max: 150 })
      world.store(Combat).set(id, { damage: 15, rangeTiles: 1, cooldownTicks: 20, cooldownRemaining: 0 })
    }
  }
  return createSimulation({
    seed: 7,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers: [0, 1, 2, 3].map((id) => ({
      id: id as 0 | 1 | 2 | 3,
      defeated: false,
      gold: id === 0 ? gold : 0,
      reservedSupply: options.overCap && id === 0 ? 1 : 0
    }))
  })
}

const train = (unitKind: 'pawn' | 'warrior' | 'archer', sequence: number, producerId = START_ENTITY_ID + 1) => ({
  tick: 1,
  playerId: 0,
  sequence,
  intent: { type: 'TRAIN' as const, payload: { producerId, unitKind } }
})

const rally = (producerId: number, sequence: number, x = tilesToFixed(8), y = tilesToFixed(6)) => ({
  tick: 1,
  playerId: 0,
  sequence,
  intent: { type: 'RALLY' as const, payload: { producerId, x, y } }
})

describe('production queue', () => {
  it('trains a Pawn at a completed Base', () => {
    const sim = scenario()
    sim.step([train('pawn', 1, START_ENTITY_ID)])

    expect(sim.inspectState().players[0]).toMatchObject({ gold: 200, reservedSupply: 1, usedSupply: 0 })
    for (let tick = 0; tick < 99; tick += 1) {
      sim.step()
    }
    expect(sim.inspectState().world.store(Production).get(START_ENTITY_ID)?.queue[0]?.status).toBe('COMPLETED_WAITING')

    sim.step()
    const state = sim.inspectState()
    expect(state.world.store(Production).get(START_ENTITY_ID)?.queue).toEqual([])
    expect(state.players[0]).toMatchObject({ gold: 200, reservedSupply: 0, usedSupply: 1 })
    expect(state.world.store(Kind).get(START_ENTITY_ID + 2)).toBe('pawn')
    expect(state.world.store(Cargo).get(START_ENTITY_ID + 2)).toMatchObject({ amount: 0, capacity: 10 })
    expect(state.world.store(Health).get(START_ENTITY_ID + 2)).toEqual({ current: 100, max: 100 })
  })

  it('rejects units at incompatible producers without changing state', () => {
    const sim = scenario(500)
    const expected = scenario(500)

    const result = sim.step([train('warrior', 1, START_ENTITY_ID), train('pawn', 2, START_ENTITY_ID + 1)])

    expect(result.rejected).toHaveLength(2)
    expected.step()
    expect(sim.hashState()).toBe(expected.hashState())
    expect(sim.inspectState().players[0]).toMatchObject({ gold: 500, reservedSupply: 0 })
  })

  it('reserves minerals and supply, then spawns a Warrior after training', () => {
    const sim = scenario()
    sim.step([train('warrior', 1)])

    expect(sim.inspectState().players[0]).toMatchObject({ gold: 150, reservedSupply: 1, usedSupply: 0 })
    expect(
      sim
        .inspectState()
        .world.store(Production)
        .get(START_ENTITY_ID + 1)?.queue[0]
    ).toMatchObject({
      unitKind: 'warrior',
      progressTicks: 1,
      totalTicks: 200,
      status: 'ACTIVE'
    })

    for (let tick = 0; tick < 199; tick += 1) {
      sim.step()
    }
    expect(
      sim
        .inspectState()
        .world.store(Production)
        .get(START_ENTITY_ID + 1)?.queue[0]?.status
    ).toBe('COMPLETED_WAITING')

    sim.step()
    const state = sim.inspectState()
    expect(state.world.store(Production).get(START_ENTITY_ID + 1)?.queue).toEqual([])
    expect(state.players[0]).toMatchObject({ gold: 150, reservedSupply: 0, usedSupply: 1 })
    expect(state.world.store(Kind).get(START_ENTITY_ID + 2)).toBe('warrior')
    expect(state.world.store(Health).get(START_ENTITY_ID + 2)).toEqual({ current: 150, max: 150 })
    expect(state.world.store(Combat).get(START_ENTITY_ID + 2)?.damage).toBe(15)
  })

  it('queues five items and rejects the sixth atomically', () => {
    const sim = scenario(1_000)
    const commands = [1, 2, 3, 4, 5].map((sequence) => train('archer', sequence))
    expect(sim.step(commands).rejected).toEqual([])
    const before = sim.hashState()
    const rejected = sim.step([train('warrior', 6)]).rejected
    const production = sim
      .inspectState()
      .world.store(Production)
      .get(START_ENTITY_ID + 1)

    expect(rejected).toHaveLength(1)
    expect(production?.queue).toHaveLength(5)
    expect(sim.inspectState().players[0]?.gold).toBe(375)
    expect(sim.hashState()).not.toBe(before)
  })

  it('restores an active queue and continues deterministically', () => {
    const original = scenario()
    original.step([train('archer', 1)])
    for (let tick = 0; tick < 10; tick += 1) {
      original.step()
    }
    const restored = simulationFromSnapshot(original.exportSnapshot())

    for (let tick = 0; tick < 60; tick += 1) {
      original.step()
      restored.step()
    }

    expect(restored.hashState()).toBe(original.hashState())
  })

  it('pauses progress when supply capacity is lost', () => {
    const sim = scenario(250, { overCap: true })
    sim.step()

    expect(
      sim
        .inspectState()
        .world.store(Production)
        .get(START_ENTITY_ID + 1)?.queue[0]
    ).toMatchObject({
      progressTicks: 0,
      status: 'ACTIVE'
    })
  })

  it('keeps a completed item waiting when the deterministic exit is occupied', () => {
    const sim = scenario(250, { blockSpawn: true, withEnemy: true })
    sim.step([train('warrior', 1)])
    for (let tick = 0; tick < 199; tick += 1) {
      sim.step()
    }
    sim.step()

    expect(
      sim
        .inspectState()
        .world.store(Production)
        .get(START_ENTITY_ID + 1)?.queue[0]?.status
    ).toBe('COMPLETED_WAITING')
    expect(sim.inspectState().players[0]?.reservedSupply).toBe(1)
  })

  it('retries a blocked exit and follows the latest rally point after spawning', () => {
    const sim = scenario(250, { blockSpawn: true, withEnemy: true })
    sim.step([rally(START_ENTITY_ID + 1, 1, tilesToFixed(6), tilesToFixed(6)), train('warrior', 2)])
    for (let tick = 0; tick < 199; tick += 1) {
      sim.step()
    }
    sim.step()

    expect(
      sim
        .inspectState()
        .world.store(Production)
        .get(START_ENTITY_ID + 1)?.queue[0]?.status
    ).toBe('COMPLETED_WAITING')
    expect(sim.inspectState().players[0]?.reservedSupply).toBe(1)

    const unblock = sim.step([
      {
        tick: sim.inspectState().tick + 1,
        playerId: 0,
        sequence: 3,
        intent: { type: 'MOVE', payload: { unitIds: [START_ENTITY_ID + 10], x: tilesToFixed(6), y: 0 } }
      }
    ])
    expect(unblock.rejected).toEqual([])
    for (let tick = 0; tick < 20; tick += 1) {
      sim.step()
    }

    const state = sim.inspectState()
    expect(state.world.store(Production).get(START_ENTITY_ID + 1)?.queue).toEqual([])
    expect(state.players[0]).toMatchObject({ reservedSupply: 0, usedSupply: 2 })
    const spawnedId = START_ENTITY_ID + 101
    expect(state.world.store(Kind).get(spawnedId)).toBe('warrior')
    expect(state.world.store(Movement).get(spawnedId)).toMatchObject({
      speedTilesPerSecond: 4,
      destX: tilesToFixed(6),
      destY: tilesToFixed(6)
    })
  })

  it('stores rally canonically and rejects rally for an unavailable producer', () => {
    const sim = scenario(250)
    const expected = scenario(250)
    const result = sim.step([rally(START_ENTITY_ID, 1, tilesToFixed(5), tilesToFixed(4))])

    expect(result.rejected).toEqual([])
    expect(sim.inspectState().world.store(Building).get(START_ENTITY_ID)?.rallyPoint).toEqual({
      x: tilesToFixed(5),
      y: tilesToFixed(4)
    })

    const restored = simulationFromSnapshot(sim.exportSnapshot())
    expect(restored.hashState()).toBe(sim.hashState())

    const rejected = expected.step([rally(START_ENTITY_ID + 99, 1, tilesToFixed(5), tilesToFixed(4))]).rejected
    expect(rejected).toHaveLength(1)
    expect(
      expected
        .inspectState()
        .world.store(Building)
        .get(START_ENTITY_ID + 1)?.rallyPoint
    ).toBeNull()
  })
})
