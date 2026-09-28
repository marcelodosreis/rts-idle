import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { tilesToFixed, type UnitKind } from '@rts/shared'
import {
  Building,
  createSimulation,
  Health,
  Kind,
  Movement,
  Orders,
  Owner,
  Position,
  type SimulationEvent
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithCombatUnits } from '../../fixtures/index.js'

function combatSim(
  ownerPositions: { readonly owner: 0 | 1 | 2 | 3; readonly x: number; readonly y: number }[],
  kinds: readonly UnitKind[] = []
) {
  const world = worldWithCombatUnits(ownerPositions.map((entry) => entry.owner))
  const ids = world.aliveIds()
  for (let i = 0; i < ids.length; i += 1) {
    world.store(Position).set(ids[i]!, { x: ownerPositions[i]!.x, y: ownerPositions[i]!.y })
    const kind = kinds[i]
    if (kind !== undefined) {
      world.store(Kind).set(ids[i]!, kind)
    }
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
  it('Monk HOLD does not auto-attack enemies in range', () => {
    const { sim, ids } = combatSim(
      [
        { owner: 0, x: 0, y: 0 },
        { owner: 1, x: tilesToFixed(1), y: 0 }
      ],
      ['monk']
    )
    const [monk, target] = ids

    const result = sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'HOLD', payload: { unitIds: [monk!] } }
      }
    ])

    expect(sim.inspectState().world.store(Health).get(target!)?.current).toBe(100)
    expect(result.events.some((event) => event.type === 'attackFired' && event.attackerId === monk)).toBe(false)
  })

  it('rejects direct ATTACK orders for Monk', () => {
    const { sim, ids } = combatSim(
      [
        { owner: 0, x: 0, y: 0 },
        { owner: 1, x: tilesToFixed(1), y: 0 }
      ],
      ['monk']
    )
    const [monk, target] = ids

    const result = sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [monk!], targetId: target! } }
      }
    ])

    expect(result.rejected[0]?.code).toBe('INVALID_STATE')
    expect(result.rejected[0]?.message).toContain('Monk cannot attack')
  })

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

  it('damages and destroys a completed building through the shared health system', () => {
    const world = worldWithCombatUnits([0, 1])
    const buildingId = 1002
    world.createEntity(buildingId)
    world.store(Position).set(buildingId, { x: tilesToFixed(1), y: 0 })
    world.store(Owner).set(buildingId, { owner: 1 })
    world.store(Building).set(buildingId, {
      buildingType: 'CASTLE',
      status: 'COMPLETED',
      progressTicks: 100,
      totalTicks: 100,
      builderId: null,
      footprint: { x: 1, y: 0, ...BUILDING_DEFINITIONS.CASTLE.footprint }
    })
    world.store(Health).set(buildingId, { current: 10, max: BUILDING_DEFINITIONS.CASTLE.maxHp })
    const sim = createSimulation({ seed: SEEDS.simulation.fixedTick, identity: TEST_IDENTITY, initialWorld: world })
    const attacker = world.aliveIds()[0]!

    const result = sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [attacker], targetId: buildingId } }
      }
    ])

    expect(sim.inspectState().world.hasEntity(buildingId)).toBe(false)
    expect(result.events).toEqual(
      expect.arrayContaining([{ type: 'damageDealt', targetId: buildingId, amount: 10, targetHp: 0 }])
    )
    expect(result.events.some((event) => event.type === 'unitDied' && event.entityId === buildingId)).toBe(false)
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
