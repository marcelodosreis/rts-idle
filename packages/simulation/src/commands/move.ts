import type { MovePayload, ScheduledCommand } from '../contracts/commands.js'
import { Movement } from '../ecs/components.js'
import { formationOffset } from '../formation.js'
import type { GameState } from '../state/state.js'
import { requireRunning, validateOwnedSelection } from './validate.js'

/**
 * Default movement speed in tiles per second until per-type stats land
 * (task A9, master plan §13).
 */
export const DEFAULT_MOVE_SPEED_TILES_PER_SECOND = 3

/**
 * Applies a MOVE command: assigns each selected unit a Movement order to its
 * formation destination (the first unit goes exactly to the target). Units then
 * walk there via the movement system; no teleport. Payload shape is validated
 * by the schema; context (phase, ownership) here.
 */
export function applyMove(state: GameState, command: ScheduledCommand, payload: MovePayload): void {
  requireRunning(state, command)
  validateOwnedSelection(state, command, payload.unitIds)
  const movements = state.world.store(Movement)
  const sorted = [...payload.unitIds].sort((a, b) => a - b)
  sorted.forEach((unitId, index) => {
    const offset = formationOffset(index)
    movements.set(unitId, {
      speedTilesPerSecond: DEFAULT_MOVE_SPEED_TILES_PER_SECOND,
      destX: payload.x + offset.dx,
      destY: payload.y + offset.dy,
      remainderX: 0,
      remainderY: 0
    })
  })
}
