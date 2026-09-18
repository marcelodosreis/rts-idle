import { tilesToFixed } from '@rts/shared'
import { createSimulation, Position, type ScheduledCommand, simulationFromSnapshot } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithCombatUnits } from '../fixtures/index.js'

function combatWorld() {
  const world = worldWithCombatUnits([0, 1])
  const ids = world.aliveIds()
  world.store(Position).set(ids[0]!, { x: 0, y: 0 })
  world.store(Position).set(ids[1]!, { x: tilesToFixed(3), y: 0 })
  return { world, ids }
}

/** A deterministic mixed command stream: move, engage, defend, patrol, surrender. */
function commandStream(ids: readonly number[]): readonly ScheduledCommand[][] {
  const [blue, red] = ids
  return [
    [
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'MOVE', payload: { unitIds: [blue], x: tilesToFixed(1), y: 0 } }
      }
    ],
    [
      {
        tick: 2,
        playerId: 1,
        sequence: 1,
        intent: { type: 'MOVE', payload: { unitIds: [red], x: tilesToFixed(2), y: 0 } }
      }
    ],
    [{ tick: 3, playerId: 0, sequence: 2, intent: { type: 'ATTACK', payload: { unitIds: [blue], targetId: red } } }],
    [{ tick: 4, playerId: 1, sequence: 2, intent: { type: 'ATTACK', payload: { unitIds: [red], targetId: blue } } }],
    [{ tick: 5, playerId: 0, sequence: 3, intent: { type: 'HOLD', payload: { unitIds: [blue] } } }],
    [
      {
        tick: 6,
        playerId: 1,
        sequence: 3,
        intent: { type: 'PATROL', payload: { unitIds: [red], x: tilesToFixed(4), y: 0 } }
      }
    ],
    [
      {
        tick: 7,
        playerId: 0,
        sequence: 4,
        intent: { type: 'ATTACK_MOVE', payload: { unitIds: [blue], x: tilesToFixed(5), y: 0 } }
      }
    ],
    []
  ]
}

describe('expanded determinism (P1.09)', () => {
  it('replays a mixed command stream tick-for-tick identically', () => {
    const build = () => {
      const { world, ids } = combatWorld()
      const sim = createSimulation({
        seed: SEEDS.determinism.replayPerTick,
        identity: TEST_IDENTITY,
        initialWorld: world
      })
      return { sim, ids }
    }
    const a = build()
    const b = build()
    const stream = commandStream(a.ids)

    for (let tick = 0; tick < 400; tick += 1) {
      expect(b.sim.hashState()).toBe(a.sim.hashState())
      const commands = stream[tick] ?? []
      a.sim.step(commands)
      b.sim.step(commands)
    }
  })

  it('continues a restored snapshot with the same mixed stream', () => {
    const { world, ids } = combatWorld()
    const original = createSimulation({
      seed: SEEDS.determinism.replaySnapshot,
      identity: TEST_IDENTITY,
      initialWorld: world
    })
    const stream = commandStream(ids)
    for (let tick = 0; tick < 60; tick += 1) {
      original.step(stream[tick] ?? [])
    }
    const snapshot = original.exportSnapshot()
    const restored = simulationFromSnapshot(snapshot)

    for (let tick = 60; tick < 400; tick += 1) {
      expect(restored.hashState()).toBe(original.hashState())
      const commands = stream[tick] ?? []
      original.step(commands)
      restored.step(commands)
    }
    expect(restored.exportSnapshot().tick).toBe(400)
  })

  it('diverges across different seeds', () => {
    const a = createSimulation({
      seed: SEEDS.determinism.replayPerTick,
      identity: TEST_IDENTITY,
      initialWorld: combatWorld().world
    })
    const b = createSimulation({
      seed: SEEDS.determinism.replaySnapshot,
      identity: TEST_IDENTITY,
      initialWorld: combatWorld().world
    })
    a.step()
    b.step()
    expect(a.hashState()).not.toBe(b.hashState())
  })

  it('keeps surrender in the deterministic stream', () => {
    const build = () => {
      const { world, ids } = combatWorld()
      const sim = createSimulation({
        seed: SEEDS.determinism.replaySnapshot,
        identity: TEST_IDENTITY,
        initialWorld: world
      })
      return { sim, ids }
    }
    const a = build()
    const b = build()
    const stream = commandStream(a.ids)
    const surrender: ScheduledCommand = {
      tick: 100,
      playerId: 1,
      sequence: 99,
      intent: { type: 'SURRENDER', payload: {} }
    }

    for (let tick = 0; tick < 200; tick += 1) {
      const commands = tick === 100 ? [...(stream[tick] ?? []), surrender] : (stream[tick] ?? [])
      a.sim.step(commands)
      b.sim.step(commands)
      expect(b.sim.hashState()).toBe(a.sim.hashState())
    }
  })
})
