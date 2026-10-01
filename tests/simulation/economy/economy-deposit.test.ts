import { START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  Building,
  Cargo,
  createSimulation,
  createWorld,
  Kind,
  Movement,
  Orders,
  Owner,
  Position,
  type ScheduledCommand,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../../fixtures/index.js'

interface DepositScenarioOptions {
  readonly workerX?: number
  readonly cargo?: number
  readonly baseOwner?: number
}

function depositScenario(options: DepositScenarioOptions = {}) {
  const world = createWorld()
  const base = START_ENTITY_ID
  const worker = START_ENTITY_ID + 1
  world.createEntity(base)
  world.store(Position).set(base, { x: 0, y: 0 })
  world.store(Owner).set(base, { owner: options.baseOwner ?? 0 })
  world.store(Building).set(base, {
    buildingType: 'CASTLE',
    status: 'COMPLETED',
    progressTicks: 1,
    totalTicks: 1,
    builderId: null,
    footprint: { x: 0, y: 0, width: 2, height: 2 }
  })
  world.createEntity(worker)
  world.store(Position).set(worker, { x: options.workerX ?? tilesToFixed(4), y: 0 })
  world.store(Owner).set(worker, { owner: 0 })
  world.store(Kind).set(worker, 'pawn')
  world.store(Cargo).set(worker, { amount: options.cargo ?? 5, capacity: 10, resourceType: 'GOLD' })
  // Keeps the match RUNNING so command admission accepts the deposit.
  const opponent = 100_000
  world.createEntity(opponent)
  world.store(Position).set(opponent, { x: tilesToFixed(31), y: tilesToFixed(31) })
  world.store(Owner).set(opponent, { owner: 1 })
  return { world, base, worker }
}

function depositCommand(workers: readonly number[], buildingId: number): ScheduledCommand {
  return {
    tick: 1,
    playerId: 0,
    sequence: 1,
    intent: { type: 'DEPOSIT', payload: { unitIds: workers, buildingId } }
  }
}

describe('Economy deposit command', () => {
  it('walks to the ordered Base, deposits the cargo, and stays idle', () => {
    const scenario = depositScenario()
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([depositCommand([scenario.worker], scenario.base)])
    const ordered = simulation.inspectState().world
    expect(ordered.store(Orders).get(scenario.worker)?.queue[0]).toEqual({
      type: 'DEPOSIT',
      buildingId: scenario.base
    })
    expect(ordered.store(Movement).get(scenario.worker)).toMatchObject({ destX: 0, destY: 0 })

    for (let tick = 0; tick < 60 && simulation.inspectState().players[0]?.resources.GOLD === 0; tick += 1) {
      simulation.step()
    }
    const state = simulation.inspectState()

    expect(state.players[0]?.resources.GOLD).toBe(5)
    expect(state.world.store(Cargo).get(scenario.worker)?.amount).toBe(0)
    expect(state.world.store(Orders).has(scenario.worker)).toBe(false)
    expect(state.world.store(Movement).has(scenario.worker)).toBe(false)
  })

  it('deposits immediately when the worker is already on the Base', () => {
    const scenario = depositScenario({ workerX: 0, cargo: 7 })
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })

    simulation.step([depositCommand([scenario.worker], scenario.base)])
    const state = simulation.inspectState()

    expect(state.players[0]?.resources.GOLD).toBe(7)
    expect(state.world.store(Cargo).get(scenario.worker)?.amount).toBe(0)
    expect(state.world.store(Orders).has(scenario.worker)).toBe(false)
  })

  it('rejects a non-Base target without mutating state', () => {
    const scenario = depositScenario()
    const controlScenario = depositScenario()
    const simulation = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: controlScenario.world
    })

    const result = simulation.step([depositCommand([scenario.worker], scenario.worker)])
    control.step()

    expect(result.rejected[0]?.code).toBe('ENTITY_UNAVAILABLE')
    expect(simulation.hashState()).toBe(control.hashState())
  })

  it('rejects a Base owned by another player without mutating state', () => {
    const scenario = depositScenario({ baseOwner: 1 })
    const controlScenario = depositScenario({ baseOwner: 1 })
    const simulation = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: controlScenario.world
    })

    const result = simulation.step([depositCommand([scenario.worker], scenario.base)])
    control.step()

    expect(result.rejected[0]?.code).toBe('NOT_OWNER')
    expect(simulation.hashState()).toBe(control.hashState())
  })

  it('round-trips a deposit order through a snapshot', () => {
    const scenario = depositScenario()
    const simulation = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: scenario.world
    })
    simulation.step([depositCommand([scenario.worker], scenario.base)])

    const restored = simulationFromSnapshot(simulation.exportSnapshot())
    expect(restored.hashState()).toBe(simulation.hashState())
    expect(restored.inspectState().world.store(Orders).get(scenario.worker)?.queue[0]).toEqual({
      type: 'DEPOSIT',
      buildingId: scenario.base
    })
  })
})
