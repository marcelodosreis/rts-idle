import type { ScheduledCommand } from '../contracts/commands.js'
import { Movement, Position } from '../ecs/components.js'
import { formationOffset } from '../formation.js'
import type { GameState } from '../state/state.js'
import { validateIntegerTarget, validateOwnedUnits } from './validate-units.js'

/** Default movement speed for units without authored stats (tiles per second). */
export const UNIT_SPEED_TILES_PER_SECOND = 4

/**
 * Applies a MOVE command: distributes the sorted units around the target in a
 * deterministic formation spiral and sets each unit's movement destination.
 * The formation offset depends on the unit's index in the id-sorted list, so
 * the same selection always yields the same destinations (deterministic group
 * movement, master plan §15.3). Units then advance toward their destination
 * one tick at a time via the movement system.
 */
export function applyMove(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'MOVE') {
    throw new Error('applyMove: expected a MOVE command')
  }
  const payload = command.intent.payload
  validateOwnedUnits(state, command, payload.unitIds)
  validateIntegerTarget(command, payload.x, payload.y)
  const positions = state.world.store(Position)
  const movements = state.world.store(Movement)
  const sorted = [...payload.unitIds].sort((a, b) => a - b)
  sorted.forEach((unitId, index) => {
    const offset = formationOffset(index)
    const destX = payload.x + offset.dx
    const destY = payload.y + offset.dy
    const current = positions.get(unitId)
    // Already at the destination: nothing to move.
    if (current !== undefined && current.x === destX && current.y === destY) {
      movements.delete(unitId)
      return
    }
    movements.set(unitId, {
      speedTilesPerSecond: UNIT_SPEED_TILES_PER_SECOND,
      destX,
      destY,
      remainderX: 0,
      remainderY: 0
    })
  })
}
