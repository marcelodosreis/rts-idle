import { unitDefinitionFor } from '@rts/game-data'
import { type PlayerId, tilesToFixed, type UnitKind } from '@rts/shared'
import {
  Combat,
  createSimulation,
  Health,
  Kind,
  Movement,
  Owner,
  Position,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { Simulation } from '../../../packages/simulation/src/engine/simulation.js'
import { SEEDS, TEST_IDENTITY, worldWithCombatUnits } from '../../fixtures/index.js'

interface UnitSetup {
  readonly owner: PlayerId
  readonly kind: UnitKind
  readonly x: number
  readonly y: number
  readonly hp?: number
  readonly damage?: number
  readonly armor?: number
  readonly rangeTiles?: number
}

function projectileSimulation(units: readonly UnitSetup[], attackResearch = false) {
  const world = worldWithCombatUnits(units.map((unit) => unit.owner))
  const ids = world.aliveIds()
  for (let index = 0; index < units.length; index += 1) {
    const id = ids[index]!
    const setup = units[index]!
    const definition = unitDefinitionFor(setup.kind)
    world.store(Position).set(id, { x: setup.x, y: setup.y })
    world.store(Owner).set(id, { owner: setup.owner })
    world.store(Kind).set(id, setup.kind)
    world.store(Health).set(id, { current: setup.hp ?? definition.maxHp, max: definition.maxHp })
    world.store(Combat).set(id, {
      armor: setup.armor ?? definition.armor,
      damage: setup.damage ?? definition.damage,
      rangeTiles: setup.rangeTiles ?? definition.rangeTiles,
      cooldownTicks: definition.cooldownTicks,
      cooldownRemaining: 0
    })
  }
  const initialPlayers = [0, 1, 2, 3].map((id) => ({
    id: id as PlayerId,
    defeated: false,
    resources: { GOLD: 0, WOOD: 0 },
    completedResearch: id === 0 && attackResearch ? (['ATTACK'] as const) : []
  }))
  const simulation = createSimulation({
    seed: SEEDS.simulation.fixedTick,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers
  })
  return { simulation, ids }
}

function attack(tick: number, sequence: number, playerId: PlayerId, unitIds: readonly number[], targetId: number) {
  return {
    tick,
    playerId,
    sequence,
    intent: { type: 'ATTACK' as const, payload: { unitIds, targetId } }
  }
}

describe('authoritative projectiles (P3.10.01)', () => {
  it('launches, travels on the next tick, impacts once, and applies armor at impact', () => {
    const { simulation, ids } = projectileSimulation([
      { owner: 0, kind: 'archer', x: 0, y: 0 },
      { owner: 1, kind: 'warrior', x: tilesToFixed(1), y: 0, armor: 3 }
    ])
    const [archer, target] = ids

    const launched = simulation.step([attack(1, 1, 0, [archer!], target!)])
    expect(launched.events.map((event) => event.type)).toEqual(['attackFired', 'projectileLaunched'])
    expect(simulation.observe(true).projectiles).toEqual([{ id: 1, kind: 'arrow', owner: 0, x: 0, y: 0 }])
    expect(simulation.inspectState().world.store(Health).get(target!)?.current).toBe(150)

    simulation.step()
    const impacted = simulation.step()
    expect(impacted.events.filter((event) => event.type === 'projectileImpacted')).toHaveLength(1)
    expect(simulation.inspectState().world.store(Health).get(target!)?.current).toBe(145)
    expect(simulation.observe(true).projectiles).toEqual([])

    const laterEvents = simulation.step().events
    expect(laterEvents.some((event) => event.type === 'projectileImpacted')).toBe(false)
    expect(simulation.inspectState().world.store(Health).get(target!)?.current).toBe(145)
  })

  it('orders launches by source entity and resolves multiple impacts in one tick', () => {
    const { simulation, ids } = projectileSimulation([
      { owner: 0, kind: 'archer', x: 0, y: 0 },
      { owner: 0, kind: 'archer', x: 0, y: 0 },
      { owner: 1, kind: 'warrior', x: tilesToFixed(1), y: 0 }
    ])
    const [first, second, target] = ids

    const launched = simulation.step([attack(1, 1, 0, [second!, first!], target!)])
    expect(
      launched.events.filter((event) => event.type === 'projectileLaunched').map((event) => event.projectileId)
    ).toEqual([1, 2])

    simulation.step()
    const impacts = simulation.step().events.filter((event) => event.type === 'projectileImpacted')
    expect(impacts.map((event) => event.projectileId)).toEqual([1, 2])
    expect(simulation.inspectState().world.store(Health).get(target!)?.current).toBe(134)
  })

  it('expires at the target last-known position without damage after the target dies', () => {
    const { simulation, ids } = projectileSimulation([
      { owner: 0, kind: 'archer', x: 0, y: 0 },
      { owner: 0, kind: 'warrior', x: tilesToFixed(1), y: 0 },
      { owner: 1, kind: 'warrior', x: tilesToFixed(2), y: 0, hp: 15 }
    ])
    const [archer, warrior, target] = ids
    simulation.step([attack(1, 1, 0, [archer!, warrior!], target!)])
    expect(simulation.inspectState().world.hasEntity(target!)).toBe(false)

    const events = []
    for (let tick = 0; tick < 4; tick += 1) {
      events.push(...simulation.step().events)
    }

    expect(events).toContainEqual({
      type: 'projectileExpired',
      projectileId: 1,
      kind: 'arrow',
      x: tilesToFixed(2),
      y: 0,
      reason: 'TARGET_DEAD'
    })
    expect(events.some((event) => event.type === 'projectileImpacted')).toBe(false)
  })

  it('continues with captured damage after its source dies and evaluates target armor', () => {
    const { simulation, ids } = projectileSimulation(
      [
        { owner: 0, kind: 'archer', x: 0, y: 0, hp: 15 },
        { owner: 1, kind: 'warrior', x: tilesToFixed(1), y: 0, armor: 3, damage: 100 }
      ],
      true
    )
    const [archer, target] = ids
    simulation.step([attack(1, 1, 0, [archer!], target!), attack(1, 1, 1, [target!], archer!)])
    expect(simulation.inspectState().world.hasEntity(archer!)).toBe(false)

    simulation.step()
    simulation.step()

    expect(simulation.inspectState().world.store(Health).get(target!)?.current).toBe(143)
  })

  it('expires at TTL through the command path when the target is beyond travel distance', () => {
    const { simulation, ids } = projectileSimulation([
      { owner: 0, kind: 'archer', x: 0, y: 0, rangeTiles: 20 },
      { owner: 0, kind: 'pawn', x: tilesToFixed(18), y: 0 },
      { owner: 1, kind: 'warrior', x: tilesToFixed(20), y: 0 }
    ])
    const [archer, , target] = ids
    simulation.step([attack(1, 1, 0, [archer!], target!)])
    const events = []
    for (let tick = 2; tick <= 21; tick += 1) {
      events.push(
        ...simulation.step(
          tick === 2
            ? [{ tick, playerId: 0, sequence: 2, intent: { type: 'STOP', payload: { unitIds: [archer!] } } }]
            : []
        ).events
      )
    }

    expect(events).toContainEqual({
      type: 'projectileExpired',
      projectileId: 1,
      kind: 'arrow',
      x: tilesToFixed(10),
      y: 0,
      reason: 'TTL'
    })
    expect(simulation.inspectState().world.store(Health).get(target!)?.current).toBe(150)
  })

  it('pursues an out-of-range target and launches only after reaching range', () => {
    const { simulation, ids } = projectileSimulation([
      { owner: 0, kind: 'archer', x: 0, y: 0 },
      { owner: 0, kind: 'pawn', x: tilesToFixed(4), y: 0 },
      { owner: 1, kind: 'warrior', x: tilesToFixed(5), y: 0 }
    ])
    const [archer, , target] = ids

    const first = simulation.step([attack(1, 1, 0, [archer!], target!)])
    expect(first.events.some((event) => event.type === 'projectileLaunched')).toBe(false)
    expect(simulation.inspectState().world.store(Movement).get(archer!)?.destX).toBe(tilesToFixed(5))

    let launched = false
    for (let tick = 0; tick < 20 && !launched; tick += 1) {
      launched = simulation.step().events.some((event) => event.type === 'projectileLaunched')
    }
    expect(launched).toBe(true)
  })

  it('homes deterministically toward a target moving across its flight path', () => {
    const setup = () =>
      projectileSimulation([
        { owner: 0, kind: 'archer', x: 0, y: 0 },
        { owner: 1, kind: 'lancer', x: tilesToFixed(2), y: 0 }
      ])
    const first = setup()
    const second = setup()
    first.simulation.step([attack(1, 1, 0, [first.ids[0]!], first.ids[1]!)])
    second.simulation.step([attack(1, 1, 0, [second.ids[0]!], second.ids[1]!)])
    const move = {
      tick: 2,
      playerId: 1 as const,
      sequence: 1,
      intent: { type: 'MOVE' as const, payload: { unitIds: [first.ids[1]!], x: tilesToFixed(2), y: tilesToFixed(4) } }
    }

    expect(second.simulation.step([move])).toEqual(first.simulation.step([move]))
    expect(first.simulation.observe(true).projectiles[0]!.y).toBeGreaterThan(0)
    expect(second.simulation.hashState()).toBe(first.simulation.hashState())
  })

  it('restores a private nonzero movement remainder with equivalent flight', () => {
    const { simulation, ids } = projectileSimulation([
      { owner: 0, kind: 'archer', x: 0, y: 0, rangeTiles: 20 },
      { owner: 0, kind: 'pawn', x: tilesToFixed(9), y: 0 },
      { owner: 1, kind: 'warrior', x: tilesToFixed(10), y: 0 }
    ])
    simulation.step([attack(1, 1, 0, [ids[0]!], ids[2]!)])
    const state = simulation.inspectState()
    const projectile = state.projectiles.active.get(1)!
    state.projectiles.active.set(1, { ...projectile, movementRemainder: 7 })
    const seeded = new Simulation(state)
    const restored = simulationFromSnapshot(seeded.exportSnapshot())

    expect(restored.step()).toEqual(seeded.step())
    expect(restored.hashState()).toBe(seeded.hashState())
    expect(restored.inspectState().projectiles.active.get(1)?.movementRemainder).toBe(7)
  })

  it('restores and replays an active projectile with equal events and hashes', () => {
    const { simulation, ids } = projectileSimulation([
      { owner: 0, kind: 'archer', x: 0, y: 0 },
      { owner: 1, kind: 'warrior', x: tilesToFixed(2), y: 0 }
    ])
    simulation.step([attack(1, 1, 0, [ids[0]!], ids[1]!)])
    const restored = simulationFromSnapshot(simulation.exportSnapshot())
    expect(restored.hashState()).toBe(simulation.hashState())

    for (let tick = 0; tick < 6; tick += 1) {
      expect(restored.step()).toEqual(simulation.step())
      expect(restored.hashState()).toBe(simulation.hashState())
    }
  })
})
