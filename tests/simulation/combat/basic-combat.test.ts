import { tilesToFixed } from '@rts/shared'
import { createSimulation, Health, Movement, Orders, Position, type SimulationEvent } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithCombatUnits } from '../../fixtures/index.js'

function combatSim(ownerPositions: { readonly owner: 0 | 1 | 2 | 3; readonly x: number; readonly y: number }[]) {
  const world = worldWithCombatUnits(ownerPositions.map((entry) => entry.owner))
  const ids = world.aliveIds()
  for (let i = 0; i < ids.length; i += 1) {
    world.store(Position).set(ids[i]!, { x: ownerPositions[i]!.x, y: ownerPositions[i]!.y })
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

describe('basic combat (P1.05)', () => {
  it('ATTACK fires at an in-range target and deals damage', () => {
    const { sim, ids } = combatSim([
      { owner: 0, x: 0, y: 0 },
      { owner: 1, x: tilesToFixed(1), y: 0 }
    ])
    const [attacker, target] = ids

    const result = sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [attacker], targetId: target } }
      }
    ])

    const health = sim.inspectState().world.store(Health).get(target)!
    expect(health.current).toBe(90)
    expect(result.events).toEqual(
      expect.arrayContaining([
        { type: 'attackFired', attackerId: attacker, targetId: target },
        { type: 'damageDealt', targetId: target, amount: 10, targetHp: 90 }
      ])
    )
  })

  it('ATTACK out of range chases the target', () => {
    const { sim, ids } = combatSim([
      { owner: 0, x: 0, y: 0 },
      { owner: 1, x: tilesToFixed(8), y: 0 }
    ])
    const [attacker, target] = ids

    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [attacker], targetId: target } }
      }
    ])

    const movement = sim.inspectState().world.store(Movement).get(attacker)!
    expect(movement.destX).toBe(tilesToFixed(8))
    expect(movement.destY).toBe(0)
  })

  it('HOLD auto-attacks the nearest enemy in range without moving', () => {
    const { sim, ids } = combatSim([
      { owner: 0, x: 0, y: 0 },
      { owner: 1, x: tilesToFixed(1), y: 0 }
    ])
    const [defender, enemy] = ids

    sim.step([{ tick: 1, playerId: 0, sequence: 1, intent: { type: 'HOLD', payload: { unitIds: [defender] } } }])

    const after = sim.inspectState()
    expect(after.world.store(Movement).get(defender)).toBeUndefined()
    expect(after.world.store(Health).get(enemy)!.current).toBe(90)
  })

  it('ATTACK_MOVE fires at an enemy encountered en route', () => {
    const { sim, ids } = combatSim([
      { owner: 0, x: 0, y: 0 },
      { owner: 1, x: tilesToFixed(1), y: 0 }
    ])
    const [mover, enemy] = ids

    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK_MOVE', payload: { unitIds: [mover], x: tilesToFixed(6), y: 0 } }
      }
    ])

    expect(sim.inspectState().world.store(Health).get(enemy)!.current).toBe(90)
  })

  it('respects the attack cooldown between shots', () => {
    const { sim, ids } = combatSim([
      { owner: 0, x: 0, y: 0 },
      { owner: 1, x: tilesToFixed(1), y: 0 }
    ])
    const [attacker, target] = ids
    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [attacker], targetId: target } }
      }
    ])

    // Immediately after the shot the cooldown runs; the next shot lands once it
    // expires, so after 20 further ticks exactly one more attack fired.
    const events = collectEvents(sim, 20)
    const attacks = events.filter((event) => event.type === 'attackFired')
    expect(attacks).toHaveLength(1)
  })

  it('kills a unit when health reaches zero and emits unitDied', () => {
    const { sim, ids } = combatSim([
      { owner: 0, x: 0, y: 0 },
      { owner: 1, x: tilesToFixed(1), y: 0 }
    ])
    const [attacker, target] = ids
    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [attacker], targetId: target } }
      }
    ])

    // 100 hp / 10 damage per shot with a 20-tick cooldown: 10 shots, ~200 ticks.
    const events = collectEvents(sim, 220)
    const died = events.filter((event) => event.type === 'unitDied' && event.entityId === target)
    expect(died).toHaveLength(1)
    expect(sim.inspectState().world.hasEntity(target)).toBe(false)
  })

  it('clears an ATTACK order when the commanded target dies', () => {
    const { sim, ids } = combatSim([
      { owner: 0, x: 0, y: 0 },
      { owner: 1, x: tilesToFixed(1), y: 0 }
    ])
    const [attacker, target] = ids
    sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [attacker], targetId: target } }
      }
    ])
    collectEvents(sim, 220)

    const orders = sim.inspectState().world.store(Orders)
    expect(orders.get(attacker)).toBeUndefined()
  })

  it('is deterministic for the same combat seed and commands', () => {
    const build = () => {
      const world = worldWithCombatUnits([0, 1], {})
      const sim = createSimulation({
        seed: SEEDS.integration.moveDeterministic,
        identity: TEST_IDENTITY,
        initialWorld: world
      })
      const ids = sim.inspectState().world.aliveIds()
      return { sim, ids }
    }
    const a = build()
    const b = build()
    const command = {
      tick: 1,
      playerId: 0 as const,
      sequence: 1,
      intent: { type: 'ATTACK' as const, payload: { unitIds: [a.ids[0]!], targetId: a.ids[1]! } }
    }
    for (let i = 0; i < 120; i += 1) {
      a.sim.step(i === 0 ? [command] : [])
      b.sim.step(i === 0 ? [command] : [])
      expect(b.sim.hashState()).toBe(a.sim.hashState())
    }
  })
})
