import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  Building,
  createSimulation,
  Health,
  Owner,
  Position,
  type ScheduledCommand,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY, worldWithCombatUnits, worldWithOwners } from '../fixtures/index.js'

const MAP_BOUNDS = { width: 32, height: 32 } as const

function tileIsBlocked(
  state: ReturnType<ReturnType<typeof createSimulation>['inspectState']>,
  x: number,
  y: number
): boolean {
  return state.navigation.definition.blockedTiles.some((tile) => tile.x === x && tile.y === y)
}

function buildCommand(): ScheduledCommand {
  return {
    tick: 1,
    playerId: 0,
    sequence: 1,
    intent: { type: 'BUILD', payload: { unitId: START_ENTITY_ID, buildingType: 'CASTLE', x: 4, y: 4 } }
  }
}

function cancelCommand(buildingId: number): ScheduledCommand {
  return {
    tick: 2,
    playerId: 0,
    sequence: 2,
    intent: { type: 'CANCEL_CONSTRUCTION', payload: { buildingId } }
  }
}

describe('navigation footprint invalidation', () => {
  it('blocks a construction footprint before advancing navigation', () => {
    const simulation = createSimulation({
      seed: 7,
      identity: TEST_IDENTITY,
      mapBounds: MAP_BOUNDS,
      initialWorld: worldWithOwners([0, 1]),
      initialPlayers: [0, 1, 2, 3].map((id) => ({
        id: id as 0 | 1 | 2 | 3,
        defeated: false,
        resources: { GOLD: id === 0 ? 200 : 0, WOOD: 0 }
      })),
      navigation: { initialRequests: [{ start: { x: 0, y: 0 }, destination: { x: 12, y: 12 } }] }
    })

    simulation.step([buildCommand()])

    const state = simulation.inspectState()
    const buildingId = START_ENTITY_ID + 2
    const footprint = state.world.store(Building).get(buildingId)?.footprint
    expect(footprint).toEqual({ x: 4, y: 4, ...BUILDING_DEFINITIONS.CASTLE.footprint })
    expect(tileIsBlocked(state, 4, 4)).toBe(true)
    expect(state.navigation.requests[0]?.state).toMatchObject({ status: 'INVALIDATED', reason: 'NAVIGATION_CHANGED' })
  })

  it('releases a canceled footprint on the next navigation substep', () => {
    const simulation = createSimulation({
      seed: 7,
      identity: TEST_IDENTITY,
      mapBounds: MAP_BOUNDS,
      initialWorld: worldWithOwners([0, 1]),
      initialPlayers: [0, 1, 2, 3].map((id) => ({
        id: id as 0 | 1 | 2 | 3,
        defeated: false,
        resources: { GOLD: id === 0 ? 200 : 0, WOOD: 0 }
      }))
    })

    simulation.step([buildCommand()])
    expect(tileIsBlocked(simulation.inspectState(), 4, 4)).toBe(true)
    simulation.step([cancelCommand(START_ENTITY_ID + 2)])

    const state = simulation.inspectState()
    expect(state.world.store(Building).get(START_ENTITY_ID + 2)).toBeUndefined()
    expect(tileIsBlocked(state, 4, 4)).toBe(false)
  })

  it('restores a dynamic footprint and releases it after destruction', () => {
    const world = worldWithCombatUnits([0], { position: { x: 0, y: 0 } })
    const buildingId = START_ENTITY_ID + 1
    world.createEntity(buildingId)
    world.store(Position).set(buildingId, { x: tilesToFixed(1), y: 0 })
    world.store(Owner).set(buildingId, { owner: 1 })
    world.store(Building).set(buildingId, {
      buildingType: 'CASTLE',
      status: 'COMPLETED',
      progressTicks: 100,
      totalTicks: 100,
      builderId: null,
      footprint: { x: 1, y: 0, ...BUILDING_DEFINITIONS.CASTLE.footprint },
      rallyPoint: null
    })
    world.store(Health).set(buildingId, { current: 10, max: BUILDING_DEFINITIONS.CASTLE.maxHp })
    const simulation = createSimulation({
      seed: 7,
      identity: TEST_IDENTITY,
      mapBounds: MAP_BOUNDS,
      initialWorld: world
    })

    simulation.step([
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [START_ENTITY_ID], targetId: buildingId } }
      }
    ])

    expect(simulation.inspectState().world.hasEntity(buildingId)).toBe(false)
    expect(tileIsBlocked(simulation.inspectState(), 1, 0)).toBe(true)
    const restored = simulationFromSnapshot(simulation.exportSnapshot())
    expect(restored.hashState()).toBe(simulation.hashState())

    simulation.step()
    restored.step()

    expect(tileIsBlocked(simulation.inspectState(), 1, 0)).toBe(false)
    expect(restored.hashState()).toBe(simulation.hashState())
  })
})
