import { BUILDING_DEFINITIONS, UNIT_PRODUCTION_DEFINITIONS } from '@rts/game-data'
import {
  BUILDING_TYPES,
  type CommandIntent,
  RESEARCH_TYPES,
  RESOURCE_KINDS,
  type ResourceKind,
  START_ENTITY_ID,
  TRAINABLE_UNIT_KINDS,
  type TrainableUnitKind,
  tilesToFixed
} from '@rts/shared'
import {
  Building,
  type BuildingData,
  createSimulation,
  createUnitEntity,
  createWorld,
  Owner,
  Position,
  Production,
  type ScheduledCommand,
  type SimulationHost
} from '@rts/simulation'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../fixtures/index.js'

const CASTLE_ID = START_ENTITY_ID
const BARRACKS_ID = START_ENTITY_ID + 1
const MONASTERY_ID = START_ENTITY_ID + 2
const PAWN_ID = START_ENTITY_ID + 3
const ENEMY_ID = START_ENTITY_ID + 4
const RESOURCE_ID = 1

interface ScenarioOptions {
  readonly resourceKind?: ResourceKind
  readonly queuedProduction?: number
}

function completedBuilding(buildingType: 'CASTLE' | 'BARRACKS' | 'MONASTERY', x: number): BuildingData {
  const definition = BUILDING_DEFINITIONS[buildingType]
  return {
    buildingType,
    status: 'COMPLETED',
    progressTicks: definition.constructionTicks,
    totalTicks: definition.constructionTicks,
    builderId: null,
    ...(buildingType === 'CASTLE' ? { tier: 2 as const } : {}),
    footprint: { x, y: 0, ...definition.footprint }
  }
}

function productionQueue(count: number) {
  return {
    queue: Array.from({ length: count }, (_, index) => ({
      unitKind: 'pawn' as const,
      cost: { GOLD: 50 },
      reservedSupply: 1,
      progressTicks: 0,
      totalTicks: 100,
      status: index === 0 ? ('ACTIVE' as const) : ('QUEUED' as const)
    }))
  }
}

function acceptedScenario(options: ScenarioOptions = {}): SimulationHost {
  const world = createWorld()
  for (const [id, buildingType, x] of [
    [CASTLE_ID, 'CASTLE', 12],
    [BARRACKS_ID, 'BARRACKS', 6],
    [MONASTERY_ID, 'MONASTERY', 0]
  ] as const) {
    world.createEntity(id)
    world.store(Position).set(id, { x: tilesToFixed(x), y: 0 })
    world.store(Owner).set(id, { owner: 0 })
    world.store(Building).set(id, completedBuilding(buildingType, x))
  }
  const queued = options.queuedProduction ?? 0
  world.store(Production).set(CASTLE_ID, productionQueue(queued))
  world.store(Production).set(BARRACKS_ID, { queue: [] })
  world.store(Production).set(MONASTERY_ID, { queue: [] })
  createUnitEntity(world, { id: PAWN_ID, x: tilesToFixed(1), y: tilesToFixed(1), owner: 0, kind: 'pawn' })
  createUnitEntity(world, { id: ENEMY_ID, x: tilesToFixed(20), y: tilesToFixed(20), owner: 1, kind: 'pawn' })
  return createSimulation({
    seed: SEEDS.determinism.replayPerTick,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers: [0, 1, 2, 3].map((id) => ({
      id: id as 0 | 1 | 2 | 3,
      defeated: false,
      resources: { GOLD: id === 0 ? 100_000 : 0, WOOD: id === 0 ? 100_000 : 0 },
      reservedSupply: id === 0 ? queued : 0
    })),
    mapBounds: { width: 32, height: 32 },
    resources: [
      {
        resourceId: RESOURCE_ID,
        kind: options.resourceKind ?? 'GOLD_MINE',
        x: tilesToFixed(2),
        y: tilesToFixed(1),
        variant: 0,
        initialAmount: 1_000,
        harvestAmount: 1,
        harvestTicks: 1,
        blocksNavigation: false
      }
    ]
  })
}

function command(intent: CommandIntent): ScheduledCommand {
  return { tick: 1, playerId: 0, sequence: 1, intent }
}

function expectAccepted(intent: CommandIntent, makeSimulation: () => SimulationHost = acceptedScenario): void {
  const first = makeSimulation()
  expect(first.step([command(intent)]).rejected).toEqual([])
  const second = makeSimulation()
  expect(second.step([command(intent)]).rejected).toEqual([])
  expect(second.hashState()).toBe(first.hashState())
}

function producerFor(unitKind: TrainableUnitKind): number {
  const producer = UNIT_PRODUCTION_DEFINITIONS[unitKind].producer
  if (producer === 'CASTLE' || producer === 'BARRACKS') {
    return producer === 'CASTLE' ? CASTLE_ID : BARRACKS_ID
  }
  return MONASTERY_ID
}

const tile = fc.integer({ min: 0, max: 31 })
const fixedPosition = fc.record({ x: tile, y: tile }).map(({ x, y }) => ({ x: tilesToFixed(x), y: tilesToFixed(y) }))

const movementIntent: fc.Arbitrary<CommandIntent> = fc.oneof(
  fixedPosition.map<CommandIntent>(({ x, y }) => ({ type: 'MOVE', payload: { unitIds: [PAWN_ID], x, y } })),
  fixedPosition.map<CommandIntent>(({ x, y }) => ({ type: 'PATROL', payload: { unitIds: [PAWN_ID], x, y } })),
  fixedPosition.map<CommandIntent>(({ x, y }) => ({ type: 'ATTACK_MOVE', payload: { unitIds: [PAWN_ID], x, y } })),
  fc.constant<CommandIntent>({ type: 'STOP', payload: { unitIds: [PAWN_ID] } }),
  fc.constant<CommandIntent>({ type: 'HOLD', payload: { unitIds: [PAWN_ID] } })
)

const buildIntent: fc.Arbitrary<CommandIntent> = fc.constantFrom(...BUILDING_TYPES).chain((buildingType) => {
  const { width, height } = BUILDING_DEFINITIONS[buildingType].footprint
  return fc
    .record({ x: fc.integer({ min: 16, max: 31 - width }), y: fc.integer({ min: 16, max: 31 - height }) })
    .map<CommandIntent>(({ x, y }) => ({
      type: 'BUILD',
      payload: { unitId: PAWN_ID, buildingType, x, y }
    }))
})

describe('accepted command-stream properties', () => {
  it('accepts generated movement and attack-move orders deterministically', () => {
    fc.assert(
      fc.property(movementIntent, (intent) => expectAccepted(intent)),
      { seed: SEEDS.determinism.replayPerTick, numRuns: 30 }
    )
  })

  it('accepts gather and deposit for every resource kind', () => {
    fc.assert(
      fc.property(fc.constantFrom(...RESOURCE_KINDS), (resourceKind) => {
        const makeSimulation = () => acceptedScenario({ resourceKind })
        const simulation = makeSimulation()
        expect(
          simulation.step([command({ type: 'GATHER', payload: { unitIds: [PAWN_ID], resourceId: RESOURCE_ID } })])
            .rejected
        ).toEqual([])
        expect(
          simulation.step([command({ type: 'DEPOSIT', payload: { unitIds: [PAWN_ID], buildingId: CASTLE_ID } })])
            .rejected
        ).toEqual([])
        const control = makeSimulation()
        control.step([command({ type: 'GATHER', payload: { unitIds: [PAWN_ID], resourceId: RESOURCE_ID } })])
        control.step([command({ type: 'DEPOSIT', payload: { unitIds: [PAWN_ID], buildingId: CASTLE_ID } })])
        expect(control.hashState()).toBe(simulation.hashState())
      }),
      { seed: SEEDS.determinism.replaySnapshot, numRuns: 10 }
    )
  })

  it('accepts every trainable unit kind at its producer', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TRAINABLE_UNIT_KINDS), (unitKind) => {
        expectAccepted({ type: 'TRAIN', payload: { producerId: producerFor(unitKind), unitKind } })
      }),
      { seed: SEEDS.determinism.replayPerTick, numRuns: 20 }
    )
  })

  it('accepts every research type at a Monastery', () => {
    fc.assert(
      fc.property(fc.constantFrom(...RESEARCH_TYPES), (researchType) => {
        expectAccepted({ type: 'RESEARCH', payload: { monasteryId: MONASTERY_ID, researchType } })
      }),
      { seed: SEEDS.determinism.replaySnapshot, numRuns: 10 }
    )
  })

  it('accepts every buildable building type on unoccupied tiles', () => {
    fc.assert(
      fc.property(buildIntent, (intent) => expectAccepted(intent)),
      { seed: SEEDS.determinism.replayPerTick, numRuns: 30 }
    )
  })

  it('accepts rally orders on every producer', () => {
    fc.assert(
      fc.property(fc.constantFrom(CASTLE_ID, BARRACKS_ID, MONASTERY_ID), fixedPosition, (producerId, { x, y }) =>
        expectAccepted({ type: 'RALLY', payload: { producerId, x, y } })
      ),
      { seed: SEEDS.determinism.replaySnapshot, numRuns: 20 }
    )
  })

  it('cancels a queued production item and preserves the remaining order', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3 }), (queueIndex) => {
        const makeSimulation = () => acceptedScenario({ queuedProduction: 4 })
        const simulation = makeSimulation()
        expect(
          simulation.step([command({ type: 'CANCEL_PRODUCTION', payload: { producerId: CASTLE_ID, queueIndex } })])
            .rejected
        ).toEqual([])
        const queue = simulation.inspectState().world.store(Production).get(CASTLE_ID)?.queue
        expect(queue).toHaveLength(3)
        expect(queue?.[0]?.status).toBe('ACTIVE')
        const control = makeSimulation()
        control.step([command({ type: 'CANCEL_PRODUCTION', payload: { producerId: CASTLE_ID, queueIndex } })])
        expect(control.hashState()).toBe(simulation.hashState())
      }),
      { seed: SEEDS.determinism.replayPerTick, numRuns: 10 }
    )
  })

  it('accepts an attack order against an enemy entity', () => {
    expectAccepted({ type: 'ATTACK', payload: { unitIds: [PAWN_ID], targetId: ENEMY_ID } })
  })
})
