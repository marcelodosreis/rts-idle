import { effectiveMovementSpeed } from '../domain/research-effects.js'
import { Movement, Position } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { movementStep } from './movement-step.js'

/**
 * System-order step 5: advance every unit that has a Movement order one tick
 * toward its destination in a straight line. On arrival the order is cleared.
 * Iteration follows alive-ids order, so the result is deterministic.
 */
export function movementSystem(state: GameState): void {
  const positions = state.world.store(Position)
  const movements = state.world.store(Movement)
  for (const id of state.world.query(Position, Movement)) {
    const movement = movements.get(id)
    if (movement === undefined) {
      continue
    }
    const position = positions.get(id)
    if (position === undefined) {
      continue
    }
    const step = movementStep({
      x: position.x,
      y: position.y,
      destX: movement.destX,
      destY: movement.destY,
      speedTilesPerSecondFixed: effectiveMovementSpeed(state, id, movement.speedTilesPerSecondFixed),
      remainderX: movement.remainderX,
      remainderY: movement.remainderY
    })
    positions.set(id, { x: step.x, y: step.y })
    if (step.arrived) {
      movements.delete(id)
    } else {
      movements.set(id, {
        ...movement,
        remainderX: step.remainderX,
        remainderY: step.remainderY
      })
    }
  }
}
