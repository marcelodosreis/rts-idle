import type { PlayerId } from '@rts/shared'
import type { ScheduledCommand } from '@rts/simulation'

export interface MoveCommandOptions {
  readonly playerId?: PlayerId
  readonly tick?: number
  readonly sequence?: number
}

/** Builds a MOVE scheduled command with test defaults (tick 1, player 0, sequence 1). */
export function buildMoveCommand(
  unitIds: readonly number[],
  x: number,
  y: number,
  options: MoveCommandOptions = {}
): ScheduledCommand {
  return {
    tick: options.tick ?? 1,
    playerId: options.playerId ?? 0,
    sequence: options.sequence ?? 1,
    intent: { type: 'MOVE', payload: { unitIds, x, y } }
  }
}
