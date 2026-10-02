import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  Building,
  type BuildingData,
  createSimulation,
  createUnitEntity,
  createWorld,
  Owner,
  Position,
  Production
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../../fixtures/index.js'

const CASTLE_ID = START_ENTITY_ID
const BARRACKS_ID = START_ENTITY_ID + 1
const MONASTERY_ID = START_ENTITY_ID + 2
const PAWN_ID = START_ENTITY_ID + 3

function completedBuilding(buildingType: 'CASTLE' | 'BARRACKS' | 'MONASTERY', x: number): BuildingData {
  const definition = BUILDING_DEFINITIONS[buildingType]
  return {
    buildingType,
    status: 'COMPLETED',
    progressTicks: definition.constructionTicks,
    totalTicks: definition.constructionTicks,
    builderId: null,
    ...(buildingType === 'CASTLE' ? { tier: 1 as const } : {}),
    footprint: { x, y: 0, ...definition.footprint }
  }
}

function scenario(options: { readonly castleTier?: 1 | 2; readonly pawnQueue?: boolean } = {}) {
  const world = createWorld()
  for (const [id, buildingType, x] of [
    [CASTLE_ID, 'CASTLE', 0],
    [BARRACKS_ID, 'BARRACKS', 6],
    [MONASTERY_ID, 'MONASTERY', 10]
  ] as const) {
    world.createEntity(id)
    world.store(Position).set(id, { x: tilesToFixed(x), y: 0 })
    world.store(Owner).set(id, { owner: 0 })
    world.store(Building).set(id, completedBuilding(buildingType, x))
  }
  world.store(Production).set(CASTLE_ID, {
    queue: options.pawnQueue
      ? [
          {
            unitKind: 'pawn',
            cost: { GOLD: 50 },
            reservedSupply: 1,
            progressTicks: 0,
            totalTicks: 100,
            status: 'ACTIVE'
          }
        ]
      : []
  })
  world.store(Production).set(BARRACKS_ID, { queue: [] })
  world.store(Production).set(MONASTERY_ID, { queue: [] })
  createUnitEntity(world, { id: PAWN_ID, x: tilesToFixed(12), y: 0, owner: 0, kind: 'pawn' })
  return createSimulation({
    seed: 1,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers: [0, 1, 2, 3].map((id) => ({
      id: id as 0 | 1 | 2 | 3,
      defeated: false,
      resources: { GOLD: id === 0 ? 500 : 0, WOOD: 0 },
      reservedSupply: options.pawnQueue && id === 0 ? 1 : 0,
      highestCastleTierReached: options.castleTier ?? 2
    }))
  })
}

function command<T extends { readonly type: string }>(intent: T, sequence: number, tick = 1) {
  return { tick, playerId: 0 as const, sequence, intent }
}

describe('Castle tier authority', () => {
  it('requires a current owned Castle II instead of historical tier access', () => {
    const simulation = scenario()
    const result = simulation.step([
      command({ type: 'TRAIN', payload: { producerId: BARRACKS_ID, unitKind: 'lancer' } }, 1),
      command({ type: 'RESEARCH', payload: { monasteryId: MONASTERY_ID, researchType: 'ATTACK' } }, 2)
    ])

    expect(result.rejected.map((rejection) => rejection.code)).toEqual(['TECH_REQUIREMENT', 'TECH_REQUIREMENT'])
    expect(simulation.inspectState().players[0]?.resources.GOLD).toBe(500)
  })

  it('rejects Castle II upgrade while the Pawn queue is occupied', () => {
    const simulation = scenario({ castleTier: 1, pawnQueue: true })
    const result = simulation.step([command({ type: 'UPGRADE_CASTLE', payload: { castleId: CASTLE_ID } }, 1)])

    expect(result.rejected[0]?.code).toBe('INVALID_STATE')
    expect(simulation.inspectState().players[0]?.resources.GOLD).toBe(500)
    expect(simulation.inspectState().world.store(Building).get(CASTLE_ID)?.tierUpgrade).toBeNull()
  })

  it('blocks Pawn training after an exclusive Castle upgrade starts', () => {
    const simulation = scenario({ castleTier: 1 })
    const result = simulation.step([
      command({ type: 'UPGRADE_CASTLE', payload: { castleId: CASTLE_ID } }, 1),
      command({ type: 'TRAIN', payload: { producerId: CASTLE_ID, unitKind: 'pawn' } }, 2)
    ])

    expect(result.rejected.map((rejection) => rejection.code)).toEqual(['INVALID_STATE'])
    expect(simulation.inspectState().world.store(Building).get(CASTLE_ID)?.tierUpgrade).toMatchObject({
      progressTicks: 1,
      totalTicks: 100
    })
  })
})
