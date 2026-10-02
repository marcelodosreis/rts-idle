import {
  BUILDING_TYPES,
  COMMAND_TYPES,
  type CommandIntent,
  PLAYER_IDS,
  RESEARCH_TYPES,
  TRAINABLE_UNIT_KINDS
} from '@rts/shared'
import { createSimulation, type ScheduledCommand, simulationFromSnapshot } from '@rts/simulation'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY, worldWithCombatUnits } from '../fixtures/index.js'

const integer = fc.integer({ min: -512, max: 512 })
const entityId = fc.nat({ max: 8 })
const coordinates = fc.record({ x: integer, y: integer })

const intentArbitrary: fc.Arbitrary<CommandIntent> = fc.oneof(
  coordinates.map(({ x, y }) => ({ type: 'MOVE', payload: { unitIds: [1], x, y } })),
  fc.constant({ type: 'STOP', payload: { unitIds: [1] } }),
  fc.constant({ type: 'HOLD', payload: { unitIds: [1] } }),
  coordinates.map(({ x, y }) => ({ type: 'PATROL', payload: { unitIds: [1], x, y } })),
  entityId.map((targetId) => ({ type: 'ATTACK', payload: { unitIds: [1], targetId } })),
  coordinates.map(({ x, y }) => ({ type: 'ATTACK_MOVE', payload: { unitIds: [1], x, y } })),
  entityId.map((resourceId) => ({ type: 'GATHER', payload: { unitIds: [1], resourceId } })),
  entityId.map((buildingId) => ({ type: 'DEPOSIT', payload: { unitIds: [1], buildingId } })),
  entityId.map((targetId) => ({ type: 'REPAIR', payload: { unitIds: [1], targetId } })),
  entityId.map((targetId) => ({ type: 'HEAL', payload: { unitIds: [1], targetId } })),
  fc.record({ buildingType: fc.constantFrom(...BUILDING_TYPES), x: integer, y: integer }).map((payload) => ({
    type: 'BUILD',
    payload: { unitId: 1, ...payload }
  })),
  entityId.map((castleId) => ({ type: 'UPGRADE_CASTLE', payload: { castleId } })),
  entityId.map((buildingId) => ({ type: 'CANCEL_CONSTRUCTION', payload: { buildingId } })),
  fc.constantFrom(...TRAINABLE_UNIT_KINDS).map((unitKind) => ({ type: 'TRAIN', payload: { producerId: 1, unitKind } })),
  fc.record({ producerId: entityId, queueIndex: fc.nat({ max: 3 }) }).map((payload) => ({
    type: 'CANCEL_PRODUCTION',
    payload
  })),
  fc.constantFrom(...RESEARCH_TYPES).map((researchType) => ({
    type: 'RESEARCH',
    payload: { monasteryId: 1, researchType }
  })),
  fc.record({ monasteryId: entityId, queueIndex: fc.nat({ max: 3 }) }).map((payload) => ({
    type: 'CANCEL_RESEARCH',
    payload
  })),
  coordinates.map(({ x, y }) => ({ type: 'RALLY', payload: { producerId: 1, x, y } })),
  fc.constant({ type: 'SURRENDER', payload: {} })
)

const commandArbitrary: fc.Arbitrary<ScheduledCommand> = fc.record({
  tick: fc.integer({ min: 1, max: 12 }),
  playerId: fc.constantFrom(...PLAYER_IDS),
  sequence: fc.nat({ max: 20 }),
  intent: intentArbitrary
})

function runStream(commands: readonly ScheduledCommand[]) {
  const simulation = createSimulationForFuzz()
  const rejected: string[][] = []
  for (let tick = 0; tick < 20; tick += 1) {
    const result = simulation.step(tick === 0 ? commands : [])
    rejected.push(result.rejected.map((error) => error.code))
  }
  return { simulation, rejected }
}

function createSimulationForFuzz() {
  return createSimulation({
    seed: SEEDS.determinism.replayPerTick,
    identity: TEST_IDENTITY,
    initialWorld: worldWithCombatUnits([0, 1])
  })
}

describe('seeded command-stream properties', () => {
  it('keeps valid, invalid, future, and all command families deterministic', () => {
    fc.assert(
      fc.property(fc.array(commandArbitrary, { minLength: 1, maxLength: 30 }), (commands) => {
        const first = runStream(commands)
        const second = runStream(commands)
        expect(second.rejected).toEqual(first.rejected)
        expect(second.simulation.hashState()).toBe(first.simulation.hashState())
        expect(first.simulation.inspectState().pendingCommands).toEqual(
          second.simulation.inspectState().pendingCommands
        )
      }),
      { seed: SEEDS.determinism.replayPerTick, numRuns: 40 }
    )
  })

  it('restores future fuzz commands without changing hashes or invalid results', () => {
    fc.assert(
      fc.property(fc.array(commandArbitrary, { minLength: 1, maxLength: 20 }), (commands) => {
        const original = createSimulationForFuzz()
        original.step(commands)
        const restored = simulationFromSnapshot(original.exportSnapshot())
        for (let tick = 0; tick < 15; tick += 1) {
          expect(restored.hashState()).toBe(original.hashState())
          const expected = original.step([])
          const actual = restored.step([])
          expect(actual.rejected.map((error) => error.code)).toEqual(expected.rejected.map((error) => error.code))
        }
      }),
      { seed: SEEDS.determinism.replaySnapshot, numRuns: 30 }
    )
  })

  it('keeps the command registry covered by the generated property', () => {
    expect(COMMAND_TYPES).toHaveLength(19)
    expect(intentArbitrary).toBeDefined()
  })
})
