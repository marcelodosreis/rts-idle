import type { EntityId, Fixed } from '@rts/shared'
import { Movement, Position } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

/** Default movement speed for units without authored stats (tiles per second). */
export const UNIT_SPEED_TILES_PER_SECOND = 4

/** Sets a fresh movement target, always resetting fractional remainders. */
export function setMovementDestination(state: GameState, id: EntityId, x: Fixed, y: Fixed): void {
  const position = state.world.store(Position).get(id)
  if (position?.x === x && position.y === y) {
    clearMovement(state, id)
    return
  }
  state.world.store(Movement).set(id, {
    speedTilesPerSecond: UNIT_SPEED_TILES_PER_SECOND,
    destX: x,
    destY: y,
    remainderX: 0,
    remainderY: 0
  })
}

export function clearMovement(state: GameState, id: EntityId): void {
  state.world.store(Movement).delete(id)
}
