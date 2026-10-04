import { unitDefinitionFor } from '@rts/game-data'
import { type EntityId, type Fixed, MOVEMENT_SPEED_SCALE } from '@rts/shared'
import { Kind, Movement, Position } from '../ecs/components.js'
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
  const kind = state.world.store(Kind).get(id)
  const baseSpeed =
    kind === undefined ? UNIT_SPEED_TILES_PER_SECOND : unitDefinitionFor(kind).movementSpeedTilesPerSecond
  state.world.store(Movement).set(id, {
    speedTilesPerSecondFixed: baseSpeed * MOVEMENT_SPEED_SCALE,
    destX: x,
    destY: y,
    remainderX: 0,
    remainderY: 0,
    path: null,
    pathIndex: 0,
    blockedTicks: 0
  })
}

export function clearMovement(state: GameState, id: EntityId): void {
  state.world.store(Movement).delete(id)
}
