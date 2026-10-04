import { tilesToFixed } from '@rts/shared'
import { Movement, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import {
  COLLISION_BUILDING_ID,
  COLLISION_UNIT_ID,
  createCollisionSimulation,
  moveCollisionUnit
} from '../fixtures/simulation/collision.js'

function isInsideBuilding(position: { readonly x: number; readonly y: number }): boolean {
  return (
    position.x > tilesToFixed(4) &&
    position.x < tilesToFixed(6) &&
    position.y > tilesToFixed(1) &&
    position.y < tilesToFixed(4)
  )
}

describe('movement collision and avoidance', () => {
  it('routes around a building without entering its footprint', () => {
    const simulation = createCollisionSimulation()
    simulation.step([moveCollisionUnit(tilesToFixed(8), tilesToFixed(2))])

    expect(simulation.inspectState().world.store(Movement).get(COLLISION_UNIT_ID)?.path).not.toBeNull()
    for (let tick = 0; tick < 120; tick += 1) {
      const position = simulation.inspectState().world.store(Position).get(COLLISION_UNIT_ID)
      expect(position).toBeDefined()
      expect(isInsideBuilding(position!)).toBe(false)
      if (!simulation.inspectState().world.store(Movement).has(COLLISION_UNIT_ID)) {
        break
      }
      simulation.step()
    }

    const state = simulation.inspectState()
    expect(state.world.store(Position).get(COLLISION_UNIT_ID)).toEqual({ x: tilesToFixed(8), y: tilesToFixed(2) })
    expect(state.world.store(Movement).has(COLLISION_UNIT_ID)).toBe(false)
    expect(state.world.store(Position).has(COLLISION_BUILDING_ID)).toBe(true)
  })

  it('reports an unreachable destination after persistent routing failure', () => {
    const simulation = createCollisionSimulation()
    const targetX = tilesToFixed(20)
    const commandResult = simulation.step([moveCollisionUnit(targetX, 0)])

    expect(commandResult.rejected).toEqual([])
    const events = []
    for (let tick = 0; tick < 24; tick += 1) {
      events.push(...simulation.step().events)
    }

    expect(events).toEqual([
      {
        type: 'movementBlocked',
        unitId: COLLISION_UNIT_ID,
        destinationX: targetX,
        destinationY: 0,
        reason: 'UNREACHABLE'
      }
    ])
  })

  it('lets a unit leave a building footprint when it starts on the footprint edge', () => {
    const simulation = createCollisionSimulation({
      unitPosition: { x: tilesToFixed(4), y: tilesToFixed(1) }
    })
    simulation.step([moveCollisionUnit(tilesToFixed(8), tilesToFixed(2))])

    for (let tick = 0; tick < 120; tick += 1) {
      if (!simulation.inspectState().world.store(Movement).has(COLLISION_UNIT_ID)) {
        break
      }
      simulation.step()
    }

    expect(simulation.inspectState().world.store(Position).get(COLLISION_UNIT_ID)).toEqual({
      x: tilesToFixed(8),
      y: tilesToFixed(2)
    })
  })
})
