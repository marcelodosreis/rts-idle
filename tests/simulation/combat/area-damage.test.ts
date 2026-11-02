import { unitDefinitionFor } from '@rts/game-data'
import {
  allocateEntityId,
  createPlayerResources,
  type EntityId,
  type PlayerId,
  type SimulationEvent,
  START_ENTITY_ID,
  tilesToFixed,
  type UnitKind
} from '@rts/shared'
import {
  AbilityCooldown,
  Building,
  type BuildingStatus,
  Combat,
  createSimulation,
  createWorld,
  Health,
  Kind,
  Orders,
  Owner,
  Position,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { Simulation } from '../../../packages/simulation/src/engine/simulation.js'
import { SEEDS, TEST_IDENTITY } from '../../fixtures/index.js'

interface UnitSetup {
  readonly owner: PlayerId
  readonly kind: UnitKind
  readonly x: number
  readonly y: number
  readonly hp?: number
  readonly armor?: number
}

interface BuildingSetup {
  readonly owner: PlayerId
  readonly buildingType: 'HOUSE'
  readonly status: BuildingStatus
  readonly x: number
  readonly y: number
  readonly hp: number
}

interface AreaSimulationOptions {
  readonly gold?: number
  readonly units: readonly UnitSetup[]
  readonly buildings?: readonly BuildingSetup[]
}

function tile(x: number, y: number): { readonly x: number; readonly y: number } {
  return { x: tilesToFixed(x), y: tilesToFixed(y) }
}

function createAreaSimulation(options: AreaSimulationOptions) {
  const world = createWorld()
  let next = START_ENTITY_ID
  const unitIds: EntityId[] = []
  for (const setup of options.units) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    const definition = unitDefinitionFor(setup.kind)
    world.store(Position).set(allocated.id, { x: setup.x, y: setup.y })
    world.store(Owner).set(allocated.id, { owner: setup.owner })
    world.store(Kind).set(allocated.id, setup.kind)
    world.store(Health).set(allocated.id, { current: setup.hp ?? definition.maxHp, max: definition.maxHp })
    world.store(Combat).set(allocated.id, {
      armor: setup.armor ?? definition.armor,
      damage: definition.damage,
      rangeTiles: definition.rangeTiles,
      cooldownTicks: definition.cooldownTicks,
      cooldownRemaining: 0
    })
    world.store(AbilityCooldown).set(allocated.id, { healCooldownRemaining: 0, explosiveShotCooldownRemaining: 0 })
    world.store(Orders).set(allocated.id, { queue: [] })
    unitIds.push(allocated.id)
  }
  const buildingIds: EntityId[] = []
  for (const setup of options.buildings ?? []) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: setup.x, y: setup.y })
    world.store(Owner).set(allocated.id, { owner: setup.owner })
    world.store(Health).set(allocated.id, { current: setup.hp, max: setup.hp })
    world.store(Building).set(allocated.id, {
      buildingType: setup.buildingType,
      status: setup.status,
      progressTicks: setup.status === 'COMPLETED' ? 1 : 0,
      totalTicks: 1,
      builderId: null,
      footprint: { x: setup.x / 256, y: setup.y / 256, width: 1, height: 1 }
    })
    buildingIds.push(allocated.id)
  }
  const simulation = createSimulation({
    seed: SEEDS.simulation.fixedTick,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers: [0, 1, 2, 3].map((id) => ({
      id: id as PlayerId,
      defeated: false,
      resources: createPlayerResources({ GOLD: id === 0 ? (options.gold ?? 25) : 0 }),
      completedResearch: []
    }))
  })
  return { simulation, unitIds, buildingIds }
}

function castCommand(tick: number, sequence: number, archerId: EntityId, targetId: EntityId, playerId: PlayerId = 0) {
  return {
    tick,
    playerId,
    sequence,
    intent: {
      type: 'EXPLOSIVE_SHOT' as const,
      payload: { unitIds: [archerId], targetId }
    }
  }
}

function stepUntilAreaImpact(
  simulation: ReturnType<typeof createSimulation>,
  first: readonly SimulationEvent[]
): readonly SimulationEvent[] {
  const events = [...first]
  for (let tick = 0; tick < 10 && !events.some((event) => event.type === 'areaDamageImpacted'); tick += 1) {
    events.push(...simulation.step().events)
  }
  return events
}

function healthOf(simulation: ReturnType<typeof createSimulation>, id: EntityId): number {
  return simulation.inspectState().world.store(Health).get(id)!.current
}

describe('Archer Explosive Shot (P3.11.01)', () => {
  it('spends once, preserves the caster order, and applies inner, falloff, armor, friendly, and building rules', () => {
    const { simulation, unitIds, buildingIds } = createAreaSimulation({
      units: [
        { owner: 0, kind: 'archer', ...tile(0, 0) },
        { owner: 0, kind: 'warrior', ...tile(2.25, 0) },
        { owner: 0, kind: 'warrior', ...tile(0, 2) },
        { owner: 1, kind: 'warrior', ...tile(2, 0) },
        { owner: 1, kind: 'pawn', ...tile(2, 0.5) },
        { owner: 1, kind: 'pawn', ...tile(2.75, 0) },
        { owner: 1, kind: 'pawn', ...tile(3.5, 0) },
        { owner: 1, kind: 'pawn', ...tile(3.75, 0) },
        { owner: 1, kind: 'warrior', ...tile(1, 0), armor: 3 },
        { owner: 1, kind: 'warrior', ...tile(2, 0.25), armor: 3 }
      ],
      buildings: [
        { owner: 1, buildingType: 'HOUSE', status: 'COMPLETED', ...tile(2, 1), hp: 500 },
        { owner: 1, buildingType: 'HOUSE', status: 'UNDER_CONSTRUCTION', ...tile(3, 1), hp: 500 }
      ]
    })
    const [archer, friendly, distantAlly, target, inner, half, outerEdge, justOutside, armorHalf, armorFull] = unitIds
    const [completedBuilding, unfinishedBuilding] = buildingIds
    const archerOrders = simulation.inspectState().world.store(Orders).get(archer!)
    const distantAllyHealth = healthOf(simulation, distantAlly!)

    const launched = simulation.step([castCommand(1, 1, archer!, target!)])
    expect(launched.rejected).toHaveLength(0)
    expect(simulation.inspectState().players[0]!.resources.GOLD).toBe(0)
    expect(simulation.inspectState().world.store(AbilityCooldown).get(archer!)?.explosiveShotCooldownRemaining).toBe(
      160
    )
    expect(simulation.inspectState().world.store(Orders).get(archer!)).toEqual(archerOrders)

    const events = stepUntilAreaImpact(simulation, launched.events)
    const impacts = events.filter((event) => event.type === 'areaDamageImpacted')
    expect(impacts).toHaveLength(1)
    expect(impacts[0]).toMatchObject({
      x: tilesToFixed(2),
      y: 0,
      innerRadius: tilesToFixed(0.5),
      totalRadius: tilesToFixed(1.5)
    })

    expect(healthOf(simulation, target!)).toBe(142)
    expect(healthOf(simulation, inner!)).toBe(92)
    expect(healthOf(simulation, half!)).toBe(96)
    expect(healthOf(simulation, outerEdge!)).toBe(96)
    expect(healthOf(simulation, justOutside!)).toBe(100)
    expect(healthOf(simulation, armorHalf!)).toBe(149)
    expect(healthOf(simulation, armorFull!)).toBe(145)
    expect(healthOf(simulation, friendly!)).toBe(150)
    expect(healthOf(simulation, distantAlly!)).toBe(distantAllyHealth)
    expect(healthOf(simulation, completedBuilding!)).toBe(496)
    expect(healthOf(simulation, unfinishedBuilding!)).toBe(500)
  })

  it('rejects hidden, out-of-range, friendly, cooldown, resource, caster, and building-state targets atomically', () => {
    const { simulation, unitIds, buildingIds } = createAreaSimulation({
      gold: 25,
      units: [
        { owner: 0, kind: 'archer', ...tile(0, 0) },
        { owner: 0, kind: 'archer', ...tile(0, 1) },
        { owner: 0, kind: 'warrior', ...tile(1, 0) },
        { owner: 0, kind: 'warrior', ...tile(0, 2) },
        { owner: 1, kind: 'warrior', ...tile(3.5, 0) },
        { owner: 1, kind: 'warrior', ...tile(6, 0) },
        { owner: 1, kind: 'warrior', ...tile(1, 1.5) }
      ],
      buildings: [{ owner: 1, buildingType: 'HOUSE', status: 'UNDER_CONSTRUCTION', ...tile(1, 2), hp: 500 }]
    })
    const [archer, secondArcher, friendly, caster, visibleOutOfRange, hidden, inRange] = unitIds
    const [unfinishedBuilding] = buildingIds

    const friendlyRejection = simulation.step([castCommand(1, 1, archer!, friendly!)])
    expect(friendlyRejection.rejected[0]?.message).toContain('friendly')

    const rangeRejection = simulation.step([castCommand(2, 2, archer!, visibleOutOfRange!)])
    expect(rangeRejection.rejected[0]?.message).toContain('out of range')

    const hiddenRejection = simulation.step([castCommand(3, 3, archer!, hidden!)])
    expect(hiddenRejection.rejected[0]?.message).toContain('hidden')

    const buildingRejection = simulation.step([castCommand(4, 4, archer!, unfinishedBuilding!)])
    expect(buildingRejection.rejected[0]?.message).toContain('not a completed building')

    const casterRejection = simulation.step([castCommand(5, 5, caster!, inRange!)])
    expect(casterRejection.rejected[0]?.message).toContain('exactly one Archer')

    expect(simulation.inspectState().players[0]!.resources.GOLD).toBe(25)
    expect(simulation.inspectState().world.store(AbilityCooldown).get(archer!)?.explosiveShotCooldownRemaining).toBe(0)
    expect(simulation.inspectState().projectiles.active.size).toBe(0)

    const accepted = simulation.step([castCommand(6, 6, archer!, inRange!)])
    expect(accepted.rejected).toHaveLength(0)
    const cooldownRejection = simulation.step([castCommand(7, 7, archer!, inRange!)])
    expect(cooldownRejection.rejected[0]?.message).toContain('cooldown')

    expect(simulation.inspectState().players[0]!.resources.GOLD).toBe(0)
    const resourceRejection = simulation.step([castCommand(8, 8, secondArcher!, inRange!)])
    expect(resourceRejection.rejected[0]?.code).toBe('INSUFFICIENT_RESOURCES')
    expect(resourceRejection.rejected[0]?.message).toContain('insufficient Gold')
  })

  it('detonates once at the last known position when the target dies in flight', () => {
    const { simulation, unitIds } = createAreaSimulation({
      units: [
        { owner: 0, kind: 'archer', ...tile(0, 0) },
        { owner: 0, kind: 'warrior', ...tile(1, 0) },
        { owner: 1, kind: 'warrior', ...tile(2, 0), hp: 15 },
        { owner: 1, kind: 'pawn', ...tile(2.25, 0) }
      ]
    })
    const [archer, killer, target, bystander] = unitIds
    const launched = simulation.step([
      castCommand(1, 1, archer!, target!),
      {
        tick: 1,
        playerId: 0,
        sequence: 2,
        intent: { type: 'ATTACK', payload: { unitIds: [killer!], targetId: target! } }
      }
    ])
    expect(simulation.inspectState().world.hasEntity(target!)).toBe(false)

    const events = stepUntilAreaImpact(simulation, launched.events)
    expect(events.filter((event) => event.type === 'areaDamageImpacted')).toHaveLength(1)
    expect(events.some((event) => event.type === 'projectileExpired')).toBe(false)
    expect(healthOf(simulation, bystander!)).toBe(92)
  })

  it('expires at TTL without detonating or refunding the cost', () => {
    const { simulation, unitIds } = createAreaSimulation({
      units: [
        { owner: 0, kind: 'archer', ...tile(0, 0) },
        { owner: 1, kind: 'warrior', ...tile(2, 0) }
      ]
    })
    const [archer, target] = unitIds
    simulation.step([castCommand(1, 1, archer!, target!)])
    const state = simulation.inspectState()
    const projectile = state.projectiles.active.get(1)!
    state.projectiles.active.set(1, { ...projectile, remainingTtl: 0 })
    const seeded = new Simulation(state)
    const events = seeded.step().events

    expect(events).toContainEqual({
      type: 'projectileExpired',
      projectileId: 1,
      kind: 'arrow',
      x: tilesToFixed(1),
      y: 0,
      reason: 'TTL'
    })
    expect(events.some((event) => event.type === 'areaDamageImpacted')).toBe(false)
    expect(seeded.inspectState().players[0]!.resources.GOLD).toBe(0)
    expect(healthOf(seeded, target!)).toBe(150)
  })

  it('continues the area impact after its source dies', () => {
    const { simulation, unitIds } = createAreaSimulation({
      units: [
        { owner: 0, kind: 'archer', ...tile(0, 0), hp: 15 },
        { owner: 1, kind: 'warrior', ...tile(0.5, 0), armor: 0 },
        { owner: 1, kind: 'warrior', ...tile(2, 0) },
        { owner: 1, kind: 'pawn', ...tile(2.25, 0) }
      ]
    })
    const [archer, attacker, target, bystander] = unitIds
    const launched = simulation.step([
      castCommand(1, 1, archer!, target!),
      {
        tick: 1,
        playerId: 1,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [attacker!], targetId: archer! } }
      }
    ])
    expect(simulation.inspectState().world.hasEntity(archer!)).toBe(false)
    const events = stepUntilAreaImpact(simulation, launched.events)
    expect(events.some((event) => event.type === 'areaDamageImpacted')).toBe(true)
    expect(healthOf(simulation, bystander!)).toBe(92)
  })

  it('processes affected entity ids in ascending order with deterministic hashes', () => {
    const run = () => {
      const { simulation, unitIds } = createAreaSimulation({
        units: [
          { owner: 0, kind: 'archer', ...tile(0, 0) },
          { owner: 1, kind: 'pawn', ...tile(2, 0.25) },
          { owner: 1, kind: 'pawn', ...tile(2, 0) },
          { owner: 1, kind: 'pawn', ...tile(2, 0.5) }
        ]
      })
      const hashes: string[] = []
      const events: SimulationEvent[] = []
      events.push(...simulation.step([castCommand(1, 1, unitIds[0]!, unitIds[2]!)]).events)
      for (let tick = 0; tick < 6; tick += 1) {
        const result = simulation.step()
        events.push(...result.events)
        hashes.push(simulation.hashState())
      }
      return { events, hashes, unitIds }
    }
    const first = run()
    const second = run()
    expect(first.events).toEqual(second.events)
    expect(first.hashes).toEqual(second.hashes)
    const damageOrder = first.events
      .filter((event) => event.type === 'damageDealt')
      .map((event) => (event.type === 'damageDealt' ? event.targetId : 0))
    expect(damageOrder).toEqual([first.unitIds[1]!, first.unitIds[2]!, first.unitIds[3]!])
  })

  it('restores an in-flight area projectile with equal events, hashes, and damage', () => {
    const { simulation, unitIds } = createAreaSimulation({
      units: [
        { owner: 0, kind: 'archer', ...tile(0, 0) },
        { owner: 1, kind: 'warrior', ...tile(2, 0) },
        { owner: 1, kind: 'pawn', ...tile(2.25, 0) }
      ]
    })
    const [archer, target, bystander] = unitIds
    simulation.step([castCommand(1, 1, archer!, target!)])
    const restored = simulationFromSnapshot(simulation.exportSnapshot())
    expect(restored.hashState()).toBe(simulation.hashState())

    for (let tick = 0; tick < 8; tick += 1) {
      expect(restored.step()).toEqual(simulation.step())
      expect(restored.hashState()).toBe(simulation.hashState())
    }
    expect(healthOf(restored, target!)).toBe(142)
    expect(healthOf(restored, bystander!)).toBe(92)
  })
})
