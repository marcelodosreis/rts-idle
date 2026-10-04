import { MOVEMENT_SPEED_SCALE } from '@rts/shared'
import {
  createSimulation,
  createUnitEntity,
  createWorld,
  effectiveArmor,
  effectiveCargoCapacity,
  effectiveDamage,
  effectiveMovementSpeed
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../../fixtures/index.js'

function stateFor(
  kind: 'pawn' | 'warrior' | 'lancer' | 'monk',
  completedResearch: readonly ('ATTACK' | 'DEFENSE' | 'ECONOMY' | 'MOVEMENT')[]
) {
  const world = createWorld()
  createUnitEntity(world, { id: 1, x: 0, y: 0, owner: 0, kind, worker: kind === 'pawn' })
  return createSimulation({
    seed: 1,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers: [
      { id: 0, defeated: false, resources: { GOLD: 0, WOOD: 0 }, completedResearch },
      { id: 1, defeated: false, resources: { GOLD: 0, WOOD: 0 } },
      { id: 2, defeated: false, resources: { GOLD: 0, WOOD: 0 } },
      { id: 3, defeated: false, resources: { GOLD: 0, WOOD: 0 } }
    ]
  }).inspectState()
}

describe('research effects', () => {
  it('applies Attack and Defense once according to unit capabilities', () => {
    const warrior = stateFor('warrior', ['ATTACK', 'ATTACK', 'DEFENSE'])
    const pawn = stateFor('pawn', ['ATTACK', 'DEFENSE'])

    expect(effectiveDamage(warrior, 1)).toBe(17)
    expect(effectiveArmor(warrior, 1)).toBe(1)
    expect(effectiveDamage(pawn, 1)).toBe(10)
    expect(effectiveArmor(pawn, 1)).toBe(0)
  })

  it('applies Economy only to Pawn cargo capacity', () => {
    const pawn = stateFor('pawn', ['ECONOMY'])
    const warrior = stateFor('warrior', ['ECONOMY'])

    expect(effectiveCargoCapacity(pawn, 1, 10)).toBe(12)
    expect(effectiveCargoCapacity(warrior, 1, 10)).toBe(10)
  })

  it('returns exact fixed-point Movement speed for capable units', () => {
    const lancer = stateFor('lancer', ['MOVEMENT'])
    const monk = stateFor('monk', ['MOVEMENT'])

    expect(effectiveMovementSpeed(lancer, 1, 5 * MOVEMENT_SPEED_SCALE)).toBe(55)
    expect(effectiveMovementSpeed(monk, 1, 4 * MOVEMENT_SPEED_SCALE)).toBe(44)
  })
})
