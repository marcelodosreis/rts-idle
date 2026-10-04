import { type ResourceDefinition, START_ENTITY_ID, UINT32_MAX } from '@rts/shared'
import {
  Building,
  Cargo,
  createResourceState,
  createSimulation,
  createWorld,
  Kind,
  Orders,
  Owner,
  Position,
  type ScheduledCommand,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../../fixtures/index.js'

const TREE = {
  resourceId: 400,
  kind: 'TREE' as const,
  x: 0,
  y: 0,
  variant: 0,
  initialAmount: 20,
  harvestAmount: 10,
  harvestTicks: 2,
  blocksNavigation: false
}

function treeField(count: number): readonly ResourceDefinition[] {
  return Array.from({ length: count }, (_, resourceId) => ({
    ...TREE,
    resourceId,
    x: (resourceId % 250) * 256,
    y: Math.floor(resourceId / 250) * 256
  }))
}

function scenario(workerCount = 1, initialAmount = TREE.initialAmount) {
  const world = createWorld()
  world.createEntity(START_ENTITY_ID)
  world.store(Position).set(START_ENTITY_ID, { x: 0, y: 0 })
  world.store(Owner).set(START_ENTITY_ID, { owner: 0 })
  world.store(Building).set(START_ENTITY_ID, {
    buildingType: 'CASTLE',
    status: 'COMPLETED',
    progressTicks: 1,
    totalTicks: 1,
    builderId: null,
    footprint: { x: 0, y: 0, width: 2, height: 2 }
  })
  const workers = Array.from({ length: workerCount }, (_, index) => START_ENTITY_ID + index + 1)
  for (const worker of workers) {
    world.createEntity(worker)
    world.store(Position).set(worker, { x: 0, y: 0 })
    world.store(Owner).set(worker, { owner: 0 })
    world.store(Kind).set(worker, 'pawn')
    world.store(Cargo).set(worker, { amount: 0, capacity: 10, resourceType: null })
  }
  world.createEntity(99_999)
  world.store(Position).set(99_999, { x: 1, y: 1 })
  world.store(Owner).set(99_999, { owner: 1 })
  const resources = [{ ...TREE, initialAmount }]
  return { workers, resources, world }
}

function gather(workers: readonly number[]): ScheduledCommand {
  return {
    tick: 1,
    playerId: 0,
    sequence: 1,
    intent: {
      type: 'GATHER',
      payload: { unitIds: workers, resourceId: TREE.resourceId }
    }
  }
}

describe('Map-authored resource harvesting', () => {
  it('keeps map trees outside the ECS and deposits wood independently from gold', () => {
    const setup = scenario()
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: setup.world,
      resources: setup.resources
    })

    expect(simulation.inspectState().world.aliveIds()).not.toContain(TREE.resourceId)
    simulation.step([gather(setup.workers)])
    simulation.step()
    const gathering = simulation.inspectState()
    expect(gathering.world.store(Cargo).get(setup.workers[0]!)).toMatchObject({ amount: 10, resourceType: 'WOOD' })
    expect(gathering.resources.amount(TREE.resourceId)).toBe(10)

    simulation.step()
    const deposited = simulation.inspectState()
    expect(deposited.players[0]?.resources.WOOD).toBe(10)
    expect(deposited.players[0]?.resources.GOLD).toBe(0)
  })

  it('allocates the final tree batch by ascending worker id and stops the other worker', () => {
    const setup = scenario(2, 10)
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: setup.world,
      resources: setup.resources
    })

    simulation.step([gather(setup.workers)])
    simulation.step()
    const state = simulation.inspectState()
    expect(state.resources.amount(TREE.resourceId)).toBe(0)
    expect(state.world.store(Cargo).get(setup.workers[0]!)?.amount).toBe(10)
    expect(state.world.store(Orders).get(setup.workers[1]!)).toBeUndefined()
  })

  it('bounds an oversized authored harvest amount by worker capacity', () => {
    const setup = scenario(1, 100)
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: setup.world,
      resources: [{ ...setup.resources[0]!, harvestAmount: 25 }]
    })

    simulation.step([gather(setup.workers)])
    simulation.step()

    const state = simulation.inspectState()
    const cargo = state.world.store(Cargo).get(setup.workers[0]!)!
    expect(cargo.amount).toBe(10)
    expect(cargo.amount).toBeLessThanOrEqual(cargo.capacity)
    expect(state.resources.amount(TREE.resourceId)).toBe(90)
  })

  it('restores a worker gathering a tree with an identical continuation hash', () => {
    const setup = scenario()
    const simulation = createSimulation({
      seed: SEEDS.simulation.deterministicPair,
      identity: TEST_IDENTITY,
      initialWorld: setup.world,
      resources: setup.resources
    })
    simulation.step([gather(setup.workers)])
    const restored = simulationFromSnapshot(simulation.exportSnapshot())

    simulation.step()
    restored.step()
    expect(restored.hashState()).toBe(simulation.hashState())
  })

  it('round-trips a resource id at the canonical u32 boundary', () => {
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      resources: [{ ...TREE, resourceId: UINT32_MAX }]
    })

    const restored = simulationFromSnapshot(simulation.exportSnapshot())

    expect(restored.inspectState().resources.amount(UINT32_MAX)).toBe(TREE.initialAmount)
    expect(restored.hashState()).toBe(simulation.hashState())
  })

  it('rejects resource ids that would truncate in canonical serialization', () => {
    expect(() =>
      createSimulation({
        seed: SEEDS.simulation.fixedTick,
        identity: TEST_IDENTITY,
        resources: [{ ...TREE, resourceId: UINT32_MAX + 1 }]
      })
    ).toThrow(/unsigned 32-bit integer/)
  })

  for (const count of [100, 1_000, 10_000, 50_000]) {
    it(`indexes ${count} passive trees without adding ECS entities`, () => {
      const simulation = createSimulation({
        seed: SEEDS.simulation.fixedTick,
        identity: TEST_IDENTITY,
        resources: treeField(count)
      })
      const state = simulation.inspectState()

      expect(state.world.aliveIds()).toHaveLength(0)
      expect(state.resources.catalog.size()).toBe(count)
      expect(state.resources.findNearest({ x: 0, y: 0, resourceType: 'WOOD' })?.resourceId).toBe(0)
    })
  }
})

describe('Resource deltas', () => {
  it('reports an empty delta across idle ticks with 50k static resources', () => {
    const count = 50_000
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      resources: treeField(count)
    })

    for (let tick = 0; tick < 5; tick += 1) {
      simulation.step()
      expect(simulation.resources(false)).toEqual([])
      expect(simulation.inspectState().resources.changed()).toEqual([])
    }
    const complete = simulation.resources(true)
    expect(complete).toHaveLength(count)
    expect(complete[0]).toEqual({ resourceId: 0, remaining: TREE.initialAmount })
    expect(complete.at(-1)).toEqual({ resourceId: count - 1, remaining: TREE.initialAmount })
  })

  it('lists exactly the altered resources in the delta generator', () => {
    const state = createResourceState(treeField(4))
    state.beginTick()
    state.harvest(2, 10)
    expect(state.changed()).toEqual([{ resourceId: 2, remaining: 10 }])

    state.beginTick()
    expect(state.changed()).toEqual([])
    state.harvest(0, 10)
    state.harvest(3, 10)
    state.harvest(1, 10)
    expect(state.changed()).toEqual([
      { resourceId: 0, remaining: 10 },
      { resourceId: 3, remaining: 10 },
      { resourceId: 1, remaining: 10 }
    ])
    expect(state.all()).toHaveLength(4)
    expect(state.all()[2]).toEqual({ resourceId: 2, remaining: 10 })
  })

  it('deltas only the harvested resource and clears it on the next tick', () => {
    const setup = scenario()
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: setup.world,
      resources: setup.resources
    })
    simulation.step([gather(setup.workers)])
    expect(simulation.resources(false)).toEqual([])

    for (let tick = 0; tick < 3 && simulation.resources(false).length === 0; tick += 1) {
      simulation.step()
    }
    expect(simulation.resources(false)).toEqual([{ resourceId: TREE.resourceId, remaining: TREE.initialAmount - 10 }])

    simulation.step()
    expect(simulation.resources(false)).toEqual([])
  })

  it('keeps changed resource bookkeeping bounded to the current tick', () => {
    const state = createResourceState(treeField(100))

    for (let tick = 0; tick < 100; tick += 1) {
      state.beginTick()
      state.harvest(tick, 1)

      expect(state.changedResourceIds).toHaveLength(1)
      expect(state.changed()).toHaveLength(1)
    }

    state.beginTick()
    expect(state.changedResourceIds).toEqual([])
    expect(state.changed()).toEqual([])
  })
})
