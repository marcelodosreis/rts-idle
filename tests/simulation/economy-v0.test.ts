import { START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  Building,
  Cargo,
  createSimulation,
  createWorld,
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
    world.store(Building).set(base, {
      buildingType: 'BASE',
      status: 'COMPLETED',
      progressTicks: 1,
      totalTicks: 1,
      builderId: null,
      footprint: { x: 0, y: 0, width: 2, height: 2 }
    })
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
  // Keep economy command fixtures in RUNNING phase after the common command
  // admission rule was introduced. This entity has no economy/combat role.
  const opponent = 100_000
  world.createEntity(opponent)
  world.store(Position).set(opponent, { x: tilesToFixed(31), y: tilesToFixed(31) })
  world.store(Owner).set(opponent, { owner: 1 })
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

  it('transfers one full batch after 200 gather ticks', () => {
    const scenario = economyScenario({ nodeX: 0 })
    const worker = scenario.workers[0]!
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand([worker], scenario.node)])
    for (let tick = 1; tick < 200; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState()

    expect(state.world.store(Cargo).get(worker)?.amount).toBe(10)
    expect(state.world.store(MineralNode).get(scenario.node)?.remaining).toBe(2_990)
    expect(state.world.store(Orders).get(worker)?.queue[0]).toMatchObject({ phase: 'TO_BASE' })
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

  it('advances every worker sharing a node on the same arrival tick', () => {
    const scenario = economyScenario({ workerCount: 4, nodeX: 0 })
    const simulation = createSimulation({
      seed: SEEDS.simulation.deterministicPair,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand(scenario.workers, scenario.node)])
    for (let tick = 1; tick < 7; tick += 1) {
      simulation.step()
    }
    for (const worker of scenario.workers) {
      expect(simulation.inspectState().world.store(Orders).get(worker)?.queue[0]).toMatchObject({
        phase: 'GATHERING',
        progressTicks: 7
      })
    }
    for (let tick = 7; tick < 200; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState().world

    for (const worker of scenario.workers) {
      expect(state.store(Cargo).get(worker)?.amount).toBe(10)
      expect(state.store(Orders).get(worker)?.queue[0]).toMatchObject({ phase: 'TO_BASE' })
    }
    expect(state.store(MineralNode).get(scenario.node)?.remaining).toBe(2_960)
  })

  it('starts each worker progress independently when workers reach the node at different ticks', () => {
    const scenario = economyScenario({ workerCount: 2, nodeX: 0 })
    const [arrivedWorker, lateWorker] = scenario.workers
    scenario.world.store(Position).set(lateWorker!, { x: -tilesToFixed(1), y: 0 })
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand(scenario.workers, scenario.node)])
    for (let tick = 1; tick < 6; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState().world

    expect(state.store(Orders).get(arrivedWorker!)?.queue[0]).toMatchObject({ phase: 'GATHERING', progressTicks: 6 })
    expect(state.store(Orders).get(lateWorker!)?.queue[0]).toMatchObject({ phase: 'GATHERING', progressTicks: 1 })
  })

  it('advances equidistant workers together after diagonal movement to a node', () => {
    const scenario = economyScenario({ workerCount: 2, nodeX: tilesToFixed(10) })
    scenario.world.store(Position).set(scenario.node, { x: tilesToFixed(10), y: tilesToFixed(8) })
    scenario.world.store(Position).set(scenario.workers[0]!, { x: tilesToFixed(8), y: tilesToFixed(7) })
    scenario.world.store(Position).set(scenario.workers[1]!, { x: tilesToFixed(8), y: tilesToFixed(9) })
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand(scenario.workers, scenario.node)])
    for (let tick = 1; tick < 15; tick += 1) {
      simulation.step()
    }

    for (const worker of scenario.workers) {
      expect(simulation.inspectState().world.store(Orders).get(worker)?.queue[0]).toMatchObject({
        phase: 'GATHERING',
        progressTicks: 4
      })
    }
  })

  it('repeats independent parallel cargo cycles and deposits their aggregate wallet value', () => {
    const scenario = economyScenario({ workerCount: 2, nodeX: 0 })
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand(scenario.workers, scenario.node)])
    for (let tick = 1; tick < 201; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState().world

    expect(simulation.inspectState().players[0]?.gold).toBe(20)
    expect(state.store(MineralNode).get(scenario.node)?.remaining).toBe(2_980)
    for (const worker of scenario.workers) {
      expect(state.store(Cargo).get(worker)?.amount).toBe(0)
      expect(state.store(Orders).get(worker)?.queue[0]).toMatchObject({ phase: 'TO_NODE', progressTicks: 0 })
    }
  })

  it('does not let parallel gathering on one node slow workers at another node', () => {
    const scenario = economyScenario({ workerCount: 4, nodeX: 0 })
    const secondNode = scenario.node + 1
    scenario.world.createEntity(secondNode)
    scenario.world.store(Position).set(secondNode, { x: tilesToFixed(2), y: 0 })
    scenario.world.store(MineralNode).set(secondNode, { remaining: 3_000 })
    scenario.world.store(Position).set(scenario.workers[2]!, { x: tilesToFixed(2), y: 0 })
    scenario.world.store(Position).set(scenario.workers[3]!, { x: tilesToFixed(2), y: 0 })
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([
      gatherCommand(scenario.workers.slice(0, 2), scenario.node),
      {
        tick: 1,
        playerId: 0,
        sequence: 2,
        intent: { type: 'GATHER', payload: { unitIds: scenario.workers.slice(2), nodeId: secondNode } }
      }
    ])
    for (let tick = 1; tick < 200; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState().world

    for (const worker of scenario.workers) {
      expect(state.store(Cargo).get(worker)?.amount).toBe(10)
    }
    expect(state.store(MineralNode).get(scenario.node)?.remaining).toBe(2_980)
    expect(state.store(MineralNode).get(secondNode)?.remaining).toBe(2_980)
  })

  it('allocates simultaneous scarce final minerals by ascending worker id without underflow', () => {
    const scenario = economyScenario({ workerCount: 3, nodeX: 0, nodeMinerals: 20 })
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand(scenario.workers, scenario.node)])
    for (let tick = 1; tick < 200; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState().world

    expect(state.store(Cargo).get(scenario.workers[0]!)?.amount).toBe(10)
    expect(state.store(Cargo).get(scenario.workers[1]!)?.amount).toBe(10)
    expect(state.store(Cargo).get(scenario.workers[2]!)?.amount).toBe(0)
    expect(state.store(MineralNode).get(scenario.node)?.remaining).toBe(0)
    expect(state.store(Orders).get(scenario.workers[2]!)).toBeUndefined()
  })

  it('returns and deposits pre-existing cargo after missing a scarce final mineral', () => {
    const scenario = economyScenario({ workerCount: 2, nodeX: 0, nodeMinerals: 10 })
    scenario.world.store(Cargo).set(scenario.workers[0]!, { amount: 10, capacity: 10 })
    scenario.world.store(Cargo).set(scenario.workers[1]!, { amount: 10, capacity: 10 })
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand(scenario.workers, scenario.node)])
    for (let tick = 1; tick < 22; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState().world

    expect(simulation.inspectState().players[0]?.gold).toBe(20)
    expect(state.store(MineralNode).get(scenario.node)?.remaining).toBe(10)
    expect(state.store(Cargo).get(scenario.workers[0]!)?.amount).toBe(0)
    expect(state.store(Cargo).get(scenario.workers[1]!)?.amount).toBe(0)
    expect(state.store(Orders).get(scenario.workers[0]!)?.queue[0]).toMatchObject({ type: 'GATHER' })
    expect(state.store(Orders).get(scenario.workers[1]!)?.queue[0]).toMatchObject({ type: 'GATHER' })
  })

  it('stops every selected parallel worker without later economy changes', () => {
    const scenario = economyScenario({ workerCount: 2, nodeX: 0 })
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([gatherCommand(scenario.workers, scenario.node)])
    for (let tick = 1; tick < 5; tick += 1) {
      simulation.step()
    }
    simulation.step([
      { tick: 6, playerId: 0, sequence: 2, intent: { type: 'STOP', payload: { unitIds: scenario.workers } } }
    ])
    const stoppedNodeRemaining = simulation.inspectState().world.store(MineralNode).get(scenario.node)?.remaining
    const stoppedCargo = scenario.workers.map(
      (worker) => simulation.inspectState().world.store(Cargo).get(worker)?.amount
    )
    const stoppedGold = simulation.inspectState().players[0]?.gold
    for (let tick = 0; tick < 10; tick += 1) {
      simulation.step()
    }

    expect(simulation.inspectState().players[0]?.gold).toBe(stoppedGold)
    expect(simulation.inspectState().world.store(MineralNode).get(scenario.node)?.remaining).toBe(stoppedNodeRemaining)
    for (const [index, worker] of scenario.workers.entries()) {
      expect(simulation.inspectState().world.store(Cargo).get(worker)?.amount).toBe(stoppedCargo[index])
      expect(simulation.inspectState().world.store(Orders).get(worker)).toBeUndefined()
    }
  })

  it('keeps snapshot-restored parallel cycles state and hash equal through deposit', () => {
    const scenario = economyScenario({ workerCount: 3, nodeX: 0 })
    const original = createSimulation({
      seed: SEEDS.simulation.deterministicPair,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    original.step([gatherCommand(scenario.workers, scenario.node)])
    for (let tick = 1; tick < 10; tick += 1) {
      original.step()
    }
    const restored = simulationFromSnapshot(original.exportSnapshot())
    for (let tick = 10; tick < 205; tick += 1) {
      expect(restored.hashState()).toBe(original.hashState())
      restored.step()
      original.step()
    }
    expect(restored.inspectState()).toEqual(original.inspectState())
    expect(restored.inspectState().players[0]?.gold).toBe(30)
  })
})
