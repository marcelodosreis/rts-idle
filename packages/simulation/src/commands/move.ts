import type { MovePayload, ScheduledCommand } from '../contracts/commands.js'
import { Position } from '../ecs/components.js'
import { formationOffset } from '../formation.js'
import type { GameState } from '../state/state.js'
import { requireRunning, validateOwnedSelection } from './validate.js'

/**
 * Applies a MOVE command after validating phase, ownership, and existence
 * (context; payload shape is validated by the schema). Distributes the sorted
 * units around the target in a deterministic formation spiral so the same
 * selection always yields the same destinations (master plan §15.3).
 */
export function applyMove(state: GameState, command: ScheduledCommand, payload: MovePayload): void {
  requireRunning(state, command)
  validateOwnedSelection(state, command, payload.unitIds)
  const positions = state.world.store(Position)
  const sorted = [...payload.unitIds].sort((a, b) => a - b)
  sorted.forEach((unitId, index) => {
    const offset = formationOffset(index)
    positions.set(unitId, { x: payload.x + offset.dx, y: payload.y + offset.dy })
  })
}
