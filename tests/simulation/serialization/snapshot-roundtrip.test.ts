import { START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  Building,
  Cargo,
  createSimulation,
  createWorld,
  deserializeState,
  Kind,
  MineralNode,
  Orders,
  Owner,
  Position,
  type SimulationHost,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../../fixtures/index.js'

describe('state serialization roundtrip', () => {
  it('produces identical hashes for identical snapshots', () => {
    const a = createSimulation({ seed: SEEDS.simulation.snapshotIdentical, identity: TEST_IDENTITY })
    const b = createSimulation({ seed: SEEDS.simulation.snapshotIdentical, identity: TEST_IDENTITY })
    a.step()
    b.step()
    expect(a.exportSnapshot().hash).toBe(b.exportSnapshot().hash)
  })

  it('round-trips serialize/deserialize without changing the hash', () => {
    const sim = createSimulation({ seed: SEEDS.simulation.snapshotRoundtrip, identity: TEST_IDENTITY })
    sim.step()
    sim.step()
    const before = sim.hashState()
    const snapshot = sim.exportSnapshot()
    const restored = simulationFromSnapshot(snapshot)
    expect(restored.hashState()).toBe(before)
    expect(restored.exportSnapshot().tick).toBe(snapshot.tick)
  })

  it('restores a state that continues identically', () => {
    const a = createSimulation({ seed: SEEDS.simulation.snapshotContinue, identity: TEST_IDENTITY })
    a.step()
    a.step()
    a.step()
    const snapshot = a.exportSnapshot()
    const b = simulationFromSnapshot(snapshot)

    for (let i = 0; i < 50; i += 1) {
      expect(b.hashState()).toBe(a.hashState())
      a.step()
      b.step()
    }
  })

  it('rejects truncated or corrupt bytes', () => {
    const sim = createSimulation({ seed: SEEDS.simulation.snapshotCorrupt, identity: TEST_IDENTITY })
    const bytes = sim.exportSnapshot().bytes
    expect(() => deserializeState(bytes.subarray(0, 3))).toThrow()
  })

  it('restores travelling, gathering, and returning economy phases exactly', () => {
    const buildEconomySimulation = (): { simulation: SimulationHost; worker: number } => {
      const world = createWorld()
      const base = START_ENTITY_ID
      const worker = START_ENTITY_ID + 1
      const node = START_ENTITY_ID + 2
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
      world.createEntity(worker)
      world.store(Position).set(worker, { x: 0, y: 0 })
      world.store(Owner).set(worker, { owner: 0 })
      world.store(Kind).set(worker, 'pawn')
      world.store(Cargo).set(worker, { amount: 0, capacity: 10 })
      world.createEntity(node)
      world.store(Position).set(node, { x: tilesToFixed(1), y: 0 })
      world.store(MineralNode).set(node, { remaining: 3_000 })
      const simulation = createSimulation({
        seed: SEEDS.simulation.snapshotContinue,
        identity: TEST_IDENTITY,
        initialWorld: world
      })
      simulation.step([
        {
          tick: 1,
          playerId: 0,
          sequence: 1,
          intent: { type: 'GATHER', payload: { unitIds: [worker], nodeId: node } }
        }
      ])
      return { simulation, worker }
    }

    for (const phase of ['TO_NODE', 'GATHERING', 'TO_BASE'] as const) {
      const { simulation, worker } = buildEconomySimulation()
      for (let tick = 0; tick < 300; tick += 1) {
        if (simulation.inspectState().world.store(Orders).get(worker)?.queue[0]?.type === 'GATHER') {
          const order = simulation.inspectState().world.store(Orders).get(worker)?.queue[0]
          if (order?.type === 'GATHER' && order.phase === phase) {
            break
          }
        }
        simulation.step()
      }
      expect(simulation.inspectState().world.store(Orders).get(worker)?.queue[0]).toMatchObject({ phase })
      const restored = simulationFromSnapshot(simulation.exportSnapshot())
      for (let tick = 0; tick < 80; tick += 1) {
        expect(restored.hashState()).toBe(simulation.hashState())
        restored.step()
        simulation.step()
      }
    }
  })
})
