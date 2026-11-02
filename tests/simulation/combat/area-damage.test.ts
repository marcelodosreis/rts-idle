import { unitDefinitionFor } from '@rts/game-data'
import { createPlayerResources, type PlayerId, tilesToFixed, type UnitKind } from '@rts/shared'
import { AbilityCooldown, Combat, createSimulation, Health, Kind, Orders, Owner, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithCombatUnits } from '../../fixtures/index.js'

interface UnitSetup {
  readonly owner: PlayerId
  readonly kind: UnitKind
  readonly x: number
  readonly y: number
}

function areaSimulation(units: readonly UnitSetup[]) {
  const world = worldWithCombatUnits(units.map((unit) => unit.owner))
  const ids = world.aliveIds()
  for (let index = 0; index < units.length; index += 1) {
    const id = ids[index]!
    const setup = units[index]!
    const definition = unitDefinitionFor(setup.kind)
    world.store(Position).set(id, { x: setup.x, y: setup.y })
    world.store(Owner).set(id, { owner: setup.owner })
    world.store(Kind).set(id, setup.kind)
    world.store(Health).set(id, { current: definition.maxHp, max: definition.maxHp })
    world.store(Combat).set(id, {
      armor: definition.armor,
      damage: definition.damage,
      rangeTiles: definition.rangeTiles,
      cooldownTicks: definition.cooldownTicks,
      cooldownRemaining: 0
    })
    world.store(AbilityCooldown).set(id, { healCooldownRemaining: 0, explosiveShotCooldownRemaining: 0 })
    world.store(Orders).set(id, { queue: [] })
  }
  const simulation = createSimulation({
    seed: SEEDS.simulation.fixedTick,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers: [0, 1, 2, 3].map((id) => ({
      id: id as PlayerId,
      defeated: false,
      resources: createPlayerResources({ GOLD: id === 0 ? 25 : 0 }),
      completedResearch: []
    }))
  })
  return { simulation, ids }
}

describe('Archer Explosive Shot (P3.11.01)', () => {
  it('spends atomically, preserves orders, and damages enemies once by radius', () => {
    const { simulation, ids } = areaSimulation([
      { owner: 0, kind: 'archer', x: 0, y: 0 },
      { owner: 1, kind: 'warrior', x: tilesToFixed(1), y: 0 },
      { owner: 1, kind: 'warrior', x: tilesToFixed(2.5), y: 0 },
      { owner: 0, kind: 'warrior', x: tilesToFixed(1), y: tilesToFixed(0.5) }
    ])
    const [archer, center, outer, friendly] = ids
    const orders = simulation.inspectState().world.store(Orders).get(archer!)

    const launched = simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'EXPLOSIVE_SHOT', payload: { unitIds: [archer!], targetId: center! } }
      }
    ])

    expect(launched.rejected).toHaveLength(0)
    expect(simulation.inspectState().players[0]!.resources.GOLD).toBe(0)
    expect(simulation.inspectState().world.store(AbilityCooldown).get(archer!)?.explosiveShotCooldownRemaining).toBe(
      160
    )
    expect(simulation.inspectState().world.store(Orders).get(archer!)).toEqual(orders)

    const impacts = [...launched.events, ...simulation.step().events]
    expect(impacts.filter((event) => event.type === 'areaDamageImpacted')).toHaveLength(1)
    expect(simulation.inspectState().world.store(Health).get(center!)?.current).toBe(142)
    expect(simulation.inspectState().world.store(Health).get(outer!)?.current).toBe(146)
    expect(simulation.inspectState().world.store(Health).get(friendly!)?.current).toBe(150)
  })
})
