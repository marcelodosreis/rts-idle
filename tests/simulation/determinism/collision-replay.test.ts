import { tilesToFixed } from '@rts/shared'
import { Movement, simulationFromSnapshot } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { COLLISION_UNIT_ID, createCollisionSimulation, moveCollisionUnit } from '../../fixtures/simulation/collision.js'

describe('collision route replay', () => {
  it('continues identically after restoring persisted movement state', () => {
    const original = createCollisionSimulation()
    original.step([moveCollisionUnit(tilesToFixed(8), tilesToFixed(2))])
    expect(original.inspectState().world.store(Movement).get(COLLISION_UNIT_ID)?.path).not.toBeNull()
    for (let tick = 0; tick < 12; tick += 1) {
      original.step()
    }

    const restored = simulationFromSnapshot(original.exportSnapshot())
    for (let tick = 0; tick < 60; tick += 1) {
      expect(restored.hashState()).toBe(original.hashState())
      restored.step()
      original.step()
    }
    expect(restored.hashState()).toBe(original.hashState())
  })
})
