import { tilesToFixed } from '@rts/shared'
import {
  AbilityCooldown,
  Building,
  Combat,
  createSimulation,
  createWorld,
  Health,
  Kind,
  Orders,
  Owner,
  Position
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../../fixtures/index.js'

function healWorld(
  options: {
    readonly targetOwner?: 0 | 1
    readonly targetFull?: boolean
    readonly targetBuilding?: boolean
    readonly targetDistanceTiles?: number
  } = {}
) {
  const world = createWorld()
  world.createEntity(1)
  world.createEntity(2)
  world.store(Position).set(1, { x: 0, y: 0 })
  world.store(Position).set(2, { x: tilesToFixed(options.targetDistanceTiles ?? 2), y: 0 })
  world.store(Owner).set(1, { owner: 0 })
  world.store(Owner).set(2, { owner: options.targetOwner ?? 0 })
  world.store(Kind).set(1, 'monk')
  world.store(Kind).set(2, 'warrior')
  world.store(Health).set(1, { current: 35, max: 60 })
  world.store(Health).set(2, { current: options.targetFull === true ? 150 : 100, max: 150 })
  world.store(Combat).set(1, { armor: 0, damage: 8, rangeTiles: 3, cooldownTicks: 20, cooldownRemaining: 0 })
  world.store(Combat).set(2, { armor: 0, damage: 15, rangeTiles: 1, cooldownTicks: 20, cooldownRemaining: 0 })
  world.store(AbilityCooldown).set(1, { healCooldownRemaining: 0 })
  world.store(Orders).set(1, { queue: [] })
  world.store(Orders).set(2, { queue: [] })
  if (options.targetBuilding === true) {
    world.store(Building).set(2, {
      buildingType: 'CASTLE',
      status: 'COMPLETED',
      progressTicks: 1,
      totalTicks: 1,
      builderId: null,
      footprint: { x: 0, y: 0, width: 1, height: 1 }
    })
  }
  return createSimulation({ seed: SEEDS.simulation.fixedTick, identity: TEST_IDENTITY, initialWorld: world })
}

describe('Monk Heal', () => {
  it('heals an allied unit and emits the cast event', () => {
    const sim = healWorld()
    const result = sim.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'HEAL', payload: { unitIds: [1], targetId: 2 } }
      }
    ])

    expect(sim.inspectState().world.store(Health).get(2)).toEqual({ current: 125, max: 150 })
    expect(result.events).toContainEqual({ type: 'healCast', healerId: 1, targetId: 2, amount: 25, targetHp: 125 })
    expect(sim.inspectState().world.store(AbilityCooldown).get(1)).toEqual({ healCooldownRemaining: 160 })
  })

  it('can heal itself, caps at max health, and rejects buildings and enemies', () => {
    const sim = healWorld()
    sim.inspectState().world.store(Health).set(1, { current: 50, max: 60 })
    const self = sim.step([
      { tick: 1, playerId: 0, sequence: 1, intent: { type: 'HEAL', payload: { unitIds: [1], targetId: 1 } } }
    ])
    expect(sim.inspectState().world.store(Health).get(1)?.current).toBe(60)
    expect(self.events).toContainEqual({ type: 'healCast', healerId: 1, targetId: 1, amount: 25, targetHp: 60 })
  })

  it('rejects enemy and building targets, full health, and cooldown casts', () => {
    const enemySim = healWorld({ targetOwner: 1 })
    const enemyResult = enemySim.step([
      { tick: 1, playerId: 0, sequence: 1, intent: { type: 'HEAL', payload: { unitIds: [1], targetId: 2 } } }
    ])
    expect(enemyResult.rejected).toHaveLength(1)

    const cooldownSim = healWorld()
    cooldownSim.step([
      { tick: 1, playerId: 0, sequence: 1, intent: { type: 'HEAL', payload: { unitIds: [1], targetId: 2 } } }
    ])
    const cooldownResult = cooldownSim.step([
      { tick: 2, playerId: 0, sequence: 2, intent: { type: 'HEAL', payload: { unitIds: [1], targetId: 2 } } }
    ])
    expect(cooldownResult.rejected).toHaveLength(1)

    const fullSim = healWorld({ targetFull: true })
    expect(
      fullSim.step([
        { tick: 1, playerId: 0, sequence: 1, intent: { type: 'HEAL', payload: { unitIds: [1], targetId: 2 } } }
      ]).rejected
    ).toHaveLength(1)

    const buildingSim = healWorld({ targetBuilding: true })
    expect(
      buildingSim.step([
        { tick: 1, playerId: 0, sequence: 1, intent: { type: 'HEAL', payload: { unitIds: [1], targetId: 2 } } }
      ]).rejected
    ).toHaveLength(1)
  })

  it('keeps the heal order while the Monk moves into range', () => {
    const sim = healWorld({ targetDistanceTiles: 6 })
    const result = sim.step([
      { tick: 1, playerId: 0, sequence: 1, intent: { type: 'HEAL', payload: { unitIds: [1], targetId: 2 } } }
    ])

    expect(result.events).toEqual([])
    expect(sim.inspectState().world.store(Health).get(2)?.current).toBe(100)
    expect(sim.inspectState().world.store(Orders).get(1)?.queue[0]).toEqual({ type: 'HEAL', targetId: 2 })
  })
})
