import { tilesToFixed } from '@rts/shared'
import { createSimulation, Health, Position, type SimulationEvent } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithCombatUnits } from '../../fixtures/index.js'

function mutualKillSim(maxHp: number) {
  const world = worldWithCombatUnits([0, 1])
  const ids = world.aliveIds()
  const positions = world.store(Position)
  positions.set(ids[0]!, { x: 0, y: 0 })
  positions.set(ids[1]!, { x: tilesToFixed(1), y: 0 })
  const healths = world.store(Health)
  for (const id of ids) {
    healths.set(id, { current: maxHp, max: maxHp })
  }
  const sim = createSimulation({ seed: SEEDS.simulation.fixedTick, identity: TEST_IDENTITY, initialWorld: world })
  return { sim, ids }
}

function collectEvents(sim: ReturnType<typeof createSimulation>, steps: number): SimulationEvent[] {
  const events: SimulationEvent[] = []
  for (let i = 0; i < steps; i += 1) {
    events.push(...sim.step().events)
  }
  return events
}

describe('simultaneous death (P1.06)', () => {
  it('removes two units that kill each other in the same tick', () => {
    const { sim, ids } = mutualKillSim(10)
    const [a, b] = ids
    sim.step([
      { tick: 1, playerId: 0, sequence: 1, intent: { type: 'ATTACK', payload: { unitIds: [a], targetId: b } } },
      { tick: 1, playerId: 1, sequence: 1, intent: { type: 'ATTACK', payload: { unitIds: [b], targetId: a } } }
    ])

    const after = sim.inspectState()
    expect(after.world.hasEntity(a)).toBe(false)
    expect(after.world.hasEntity(b)).toBe(false)
  })

  it('emits both unitDied events in the same tick with matching killers', () => {
    const { sim, ids } = mutualKillSim(10)
    const [a, b] = ids
    const result = sim.step([
      { tick: 1, playerId: 0, sequence: 1, intent: { type: 'ATTACK', payload: { unitIds: [a], targetId: b } } },
      { tick: 1, playerId: 1, sequence: 1, intent: { type: 'ATTACK', payload: { unitIds: [b], targetId: a } } }
    ])

    const died = result.events.filter((event) => event.type === 'unitDied')
    expect(died).toHaveLength(2)
    const aDeath = died.find((event) => event.entityId === a)
    const bDeath = died.find((event) => event.entityId === b)
    expect(aDeath).toMatchObject({ type: 'unitDied', owner: 0, killerId: b })
    expect(bDeath).toMatchObject({ type: 'unitDied', owner: 1, killerId: a })
  })

  it('applies both damage events before either death resolves', () => {
    const { sim, ids } = mutualKillSim(15)
    const [a, b] = ids
    const result = sim.step([
      { tick: 1, playerId: 0, sequence: 1, intent: { type: 'ATTACK', payload: { unitIds: [a], targetId: b } } },
      { tick: 1, playerId: 1, sequence: 1, intent: { type: 'ATTACK', payload: { unitIds: [b], targetId: a } } }
    ])

    // Both took their full hit this tick (15 - 10 = 5) even though the other
    // side also fired: the buffer resolves the whole tick before either death.
    const after = sim.inspectState()
    expect(after.world.hasEntity(a)).toBe(true)
    expect(after.world.hasEntity(b)).toBe(true)
    expect(after.world.store(Health).get(a)!.current).toBe(5)
    expect(after.world.store(Health).get(b)!.current).toBe(5)
    expect(result.events.filter((event) => event.type === 'damageDealt')).toHaveLength(2)
  })

  it('is deterministic for a mutual-kill sequence', () => {
    const build = () => {
      const world = worldWithCombatUnits([0, 1])
      const ids = world.aliveIds()
      world.store(Position).set(ids[0]!, { x: 0, y: 0 })
      world.store(Position).set(ids[1]!, { x: tilesToFixed(1), y: 0 })
      return createSimulation({
        seed: SEEDS.integration.moveDeterministic,
        identity: TEST_IDENTITY,
        initialWorld: world
      })
    }
    const a = build()
    const b = build()
    const ids = a.inspectState().world.aliveIds()
    const commands = [
      {
        tick: 1,
        playerId: 0 as const,
        sequence: 1,
        intent: { type: 'ATTACK' as const, payload: { unitIds: [ids[0]!], targetId: ids[1]! } }
      },
      {
        tick: 1,
        playerId: 1 as const,
        sequence: 1,
        intent: { type: 'ATTACK' as const, payload: { unitIds: [ids[1]!], targetId: ids[0]! } }
      }
    ]
    for (let i = 0; i < 40; i += 1) {
      a.step(i === 0 ? commands : [])
      b.step(i === 0 ? commands : [])
      expect(b.hashState()).toBe(a.hashState())
    }
  })

  it('continues cleanly after a mutual kill (no dangling references)', () => {
    const { sim, ids } = mutualKillSim(10)
    const [a, b] = ids
    sim.step([
      { tick: 1, playerId: 0, sequence: 1, intent: { type: 'ATTACK', payload: { unitIds: [a], targetId: b } } },
      { tick: 1, playerId: 1, sequence: 1, intent: { type: 'ATTACK', payload: { unitIds: [b], targetId: a } } }
    ])

    const events = collectEvents(sim, 40)
    expect(sim.inspectState().world.aliveIds()).toEqual([])
    expect(events.every((event) => event.type !== 'unitDied')).toBe(true)
  })
})
