import { START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  Base,
  Cargo,
  Combat,
  createSimulation,
  createWorld,
  Health,
  hashState,
  Kind,
  MineralNode,
  Orders,
  Owner,
  Position,
  type ScheduledCommand,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../fixtures/index.js'

interface EconomyScenarioOptions {
  readonly workerCount?: number
  readonly nodeX?: number
  readonly nodeMinerals?: number
  readonly includeBase?: boolean
}

function economyScenario(options: EconomyScenarioOptions = {}) {
  const world = createWorld()
  const base = START_ENTITY_ID
  const workers = Array.from({ length: options.workerCount ?? 1 }, (_, index) => START_ENTITY_ID + 1 + index)
  const node = START_ENTITY_ID + 1 + workers.length
  if (options.includeBase !== false) {
    world.createEntity(base)
    world.store(Position).set(base, { x: 0, y: 0 })
    world.store(Owner).set(base, { owner: 0 })
    world.store(Base).set(base, {})
  }
  for (const worker of workers) {
    world.createEntity(worker)
    world.store(Position).set(worker, { x: 0, y: 0 })
    world.store(Owner).set(worker, { owner: 0 })
    world.store(Kind).set(worker, 'pawn')
    world.store(Cargo).set(worker, { amount: 0, capacity: 10 })
  }
  world.createEntity(node)
  world.store(Position).set(node, { x: options.nodeX ?? tilesToFixed(1), y: 0 })
  world.store(MineralNode).set(node, { remaining: options.nodeMinerals ?? 3_000 })
  return { world, base, workers, node }
}

function gatherCommand(workers: readonly number[], node: number): ScheduledCommand {
  return {
    tick: 1,
    playerId: 0,
    sequence: 1,
    intent: { type: 'GATHER', payload: { unitIds: workers, nodeId: node } }
  }
}

describe('Economy v0 gathering loop', () => {
  it('uses the post-movement position to start gathering on the arrival tick', () => {
    const scenario = economyScenario({ nodeX: 0 })
    const worker = scenario.workers[0]!
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand([worker], scenario.node)])

    expect(simulation.inspectState().world.store(Orders).get(worker)?.queue[0]).toEqual({
      type: 'GATHER',
      nodeId: scenario.node,
      baseId: null,
      phase: 'GATHERING',
      progressTicks: 1
    })
  })

  it('transfers one mineral after 20 gather ticks', () => {
    const scenario = economyScenario({ nodeX: 0 })
    const worker = scenario.workers[0]!
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand([worker], scenario.node)])
    for (let tick = 1; tick < 20; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState()

    expect(state.world.store(Cargo).get(worker)?.amount).toBe(1)
    expect(state.world.store(MineralNode).get(scenario.node)?.remaining).toBe(2_999)
    expect(state.players[0]?.gold).toBe(0)
  })

  it('gathers, carries, deposits, and automatically returns for another trip', () => {
    const scenario = economyScenario()
    const worker = scenario.workers[0]!
    const simulation = createSimulation({
      seed: SEEDS.simulation.deterministicPair,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand([worker], scenario.node)])
    for (let tick = 1; tick < 400 && simulation.inspectState().players[0]?.gold === 0; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState()

    expect(state.players[0]?.gold).toBe(10)
    expect(state.world.store(Cargo).get(worker)?.amount).toBe(0)
    expect(state.world.store(MineralNode).get(scenario.node)?.remaining).toBe(2_990)
    expect(state.world.store(Orders).get(worker)?.queue[0]).toMatchObject({
      type: 'GATHER',
      nodeId: scenario.node,
      phase: 'TO_NODE'
    })
  })

  it('allows only the lowest-id worker to progress on a contested node', () => {
    const scenario = economyScenario({ workerCount: 2, nodeX: 0 })
    const simulation = createSimulation({
      seed: SEEDS.simulation.deterministicPair,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand(scenario.workers, scenario.node)])
    for (let tick = 1; tick < 20; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState().world

    expect(state.store(Cargo).get(scenario.workers[0]!)?.amount).toBe(1)
    expect(state.store(Cargo).get(scenario.workers[1]!)?.amount).toBe(0)
    expect(state.store(MineralNode).get(scenario.node)?.remaining).toBe(2_999)
  })

  it('returns and deposits a partial load when the node is exhausted', () => {
    const scenario = economyScenario({ nodeX: 0, nodeMinerals: 3 })
    const worker = scenario.workers[0]!
    const simulation = createSimulation({
      seed: SEEDS.simulation.deterministicPair,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand([worker], scenario.node)])
    for (let tick = 1; tick < 100 && simulation.inspectState().players[0]?.gold === 0; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState()

    expect(state.players[0]?.gold).toBe(3)
    expect(state.world.store(MineralNode).get(scenario.node)?.remaining).toBe(0)
    expect(state.world.store(Cargo).get(worker)?.amount).toBe(0)
    expect(state.world.store(Orders).get(worker)).toBeUndefined()
  })

  it('keeps cargo and waits when no owned Base is available', () => {
    const scenario = economyScenario({ includeBase: false, nodeX: 0, nodeMinerals: 1 })
    const worker = scenario.workers[0]!
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand([worker], scenario.node)])
    for (let tick = 1; tick < 20; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState()

    expect(state.players[0]?.gold).toBe(0)
    expect(state.world.store(Cargo).get(worker)?.amount).toBe(1)
    expect(state.world.store(Orders).get(worker)?.queue[0]).toMatchObject({
      type: 'GATHER',
      phase: 'WAITING_FOR_BASE',
      baseId: null
    })
    const restored = simulationFromSnapshot(simulation.exportSnapshot())
    expect(restored.hashState()).toBe(simulation.hashState())
    expect(restored.inspectState().world.store(Orders).get(worker)?.queue[0]).toMatchObject({
      type: 'GATHER',
      phase: 'WAITING_FOR_BASE'
    })
  })

  it('selects the nearest owned Base with entity id as the distance tie-break', () => {
    const scenario = economyScenario({ nodeX: tilesToFixed(1) })
    const worker = scenario.workers[0]!
    const secondBase = scenario.node + 1
    scenario.world.createEntity(secondBase)
    scenario.world.store(Position).set(secondBase, { x: tilesToFixed(2), y: 0 })
    scenario.world.store(Owner).set(secondBase, { owner: 0 })
    scenario.world.store(Base).set(secondBase, {})
    scenario.world.store(Position).set(worker, { x: tilesToFixed(1), y: 0 })
    scenario.world.store(Cargo).set(worker, { amount: 9, capacity: 10 })
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand([worker], scenario.node)])
    for (let tick = 1; tick < 20; tick += 1) {
      simulation.step()
    }

    expect(simulation.inspectState().world.store(Orders).get(worker)?.queue[0]).toMatchObject({
      type: 'GATHER',
      phase: 'TO_BASE',
      baseId: scenario.base
    })
  })

  it('keeps carried minerals when another command cancels gathering', () => {
    const scenario = economyScenario({ nodeX: 0 })
    const worker = scenario.workers[0]!
    scenario.world.store(Cargo).set(worker, { amount: 5, capacity: 10 })
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([
      gatherCommand([worker], scenario.node),
      { tick: 1, playerId: 0, sequence: 2, intent: { type: 'STOP', payload: { unitIds: [worker] } } }
    ])
    const state = simulation.inspectState()

    expect(state.world.store(Cargo).get(worker)?.amount).toBe(5)
    expect(state.players[0]?.gold).toBe(0)
    expect(state.world.store(Orders).get(worker)).toBeUndefined()
  })

  it('returns an already-full cargo before gathering from a newly commanded node', () => {
    const scenario = economyScenario({ nodeX: 0 })
    const worker = scenario.workers[0]!
    scenario.world.store(Cargo).set(worker, { amount: 10, capacity: 10 })
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand([worker], scenario.node)])
    const state = simulation.inspectState()

    expect(state.world.store(MineralNode).get(scenario.node)?.remaining).toBe(3_000)
    expect(state.world.store(Cargo).get(worker)?.amount).toBe(10)
    expect(state.world.store(Orders).get(worker)?.queue[0]).toMatchObject({
      type: 'GATHER',
      phase: 'TO_BASE',
      baseId: scenario.base
    })
  })

  it('loses carried minerals when the worker dies', () => {
    const scenario = economyScenario({ nodeX: 0 })
    const worker = scenario.workers[0]!
    const enemy = scenario.node + 1
    scenario.world.store(Cargo).set(worker, { amount: 5, capacity: 10 })
    scenario.world.store(Health).set(worker, { current: 1, max: 1 })
    scenario.world.createEntity(enemy)
    scenario.world.store(Position).set(enemy, { x: 0, y: 0 })
    scenario.world.store(Owner).set(enemy, { owner: 1 })
    scenario.world.store(Health).set(enemy, { current: 100, max: 100 })
    scenario.world.store(Combat).set(enemy, {
      damage: 1,
      rangeTiles: 1,
      cooldownTicks: 1,
      cooldownRemaining: 0
    })
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([
      gatherCommand([worker], scenario.node),
      { tick: 1, playerId: 1, sequence: 1, intent: { type: 'ATTACK', payload: { unitIds: [enemy], targetId: worker } } }
    ])
    const state = simulation.inspectState()

    expect(state.world.hasEntity(worker)).toBe(false)
    expect(state.world.store(Cargo).has(worker)).toBe(false)
    expect(state.players[0]?.gold).toBe(0)
  })

  it('produces identical hashes for the same economy command stream', () => {
    const firstScenario = economyScenario()
    const secondScenario = economyScenario()
    const first = createSimulation({
      seed: SEEDS.simulation.deterministicPair,
      identity: TEST_IDENTITY,
      initialWorld: firstScenario.world
    })
    const second = createSimulation({
      seed: SEEDS.simulation.deterministicPair,
      identity: TEST_IDENTITY,
      initialWorld: secondScenario.world
    })
    first.step([gatherCommand(firstScenario.workers, firstScenario.node)])
    second.step([gatherCommand(secondScenario.workers, secondScenario.node)])

    for (let tick = 1; tick < 300; tick += 1) {
      expect(second.hashState()).toBe(first.hashState())
      first.step()
      second.step()
    }
  })

  it('includes node, cargo, and wallet values in the deterministic hash', () => {
    const baselineScenario = economyScenario({ nodeMinerals: 3_000 })
    const changedNodeScenario = economyScenario({ nodeMinerals: 2_999 })
    const changedCargoScenario = economyScenario({ nodeMinerals: 3_000 })
    changedCargoScenario.world.store(Cargo).set(changedCargoScenario.workers[0]!, { amount: 1, capacity: 10 })
    const baseline = createSimulation({
      seed: SEEDS.simulation.deterministicPair,
      identity: TEST_IDENTITY,
      initialWorld: baselineScenario.world
    })
    const changedNode = createSimulation({
      seed: SEEDS.simulation.deterministicPair,
      identity: TEST_IDENTITY,
      initialWorld: changedNodeScenario.world
    })
    const changedCargo = createSimulation({
      seed: SEEDS.simulation.deterministicPair,
      identity: TEST_IDENTITY,
      initialWorld: changedCargoScenario.world
    })
    const changedWalletState = baseline.inspectState()
    changedWalletState.players[0]!.gold = 1

    expect(changedNode.hashState()).not.toBe(baseline.hashState())
    expect(changedCargo.hashState()).not.toBe(baseline.hashState())
    expect(hashState(changedWalletState)).not.toBe(baseline.hashState())
  })
})
