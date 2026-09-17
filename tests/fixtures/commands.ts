import type { PlayerId } from '@rts/shared'
import type { ScheduledCommand } from '@rts/simulation'

export interface MoveCommandOptions {
  readonly playerId?: PlayerId
  readonly tick?: number
  readonly sequence?: number
  readonly mode?: 'replace' | 'append'
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
    intent: { type: 'MOVE', payload: { unitIds, x, y, ...(options.mode !== undefined ? { mode: options.mode } : {}) } }
  }
}

/** Builds a STOP scheduled command for the given units. */
export function buildStopCommand(unitIds: readonly number[], options: MoveCommandOptions = {}): ScheduledCommand {
  return {
    tick: options.tick ?? 1,
    playerId: options.playerId ?? 0,
    sequence: options.sequence ?? 1,
    intent: { type: 'STOP', payload: { unitIds } }
  }
}

/** Builds a HOLD scheduled command for the given units. */
export function buildHoldCommand(unitIds: readonly number[], options: MoveCommandOptions = {}): ScheduledCommand {
  return {
    tick: options.tick ?? 1,
    playerId: options.playerId ?? 0,
    sequence: options.sequence ?? 1,
    intent: { type: 'HOLD', payload: { unitIds } }
  }
}

/** Builds a SURRENDER scheduled command for a player. */
export function buildSurrenderCommand(options: MoveCommandOptions = {}): ScheduledCommand {
  return {
    tick: options.tick ?? 1,
    playerId: options.playerId ?? 0,
    sequence: options.sequence ?? 1,
    intent: { type: 'SURRENDER', payload: {} }
  }
}

/** Builds an ATTACK scheduled command on an explicit target. */
export function buildAttackCommand(
  unitIds: readonly number[],
  targetId: number,
  options: MoveCommandOptions = {}
): ScheduledCommand {
  return {
    tick: options.tick ?? 1,
    playerId: options.playerId ?? 0,
    sequence: options.sequence ?? 1,
    intent: {
      type: 'ATTACK',
      payload: { unitIds, targetId, ...(options.mode !== undefined ? { mode: options.mode } : {}) }
    }
  }
}

/** Builds a PATROL scheduled command between two points. */
export function buildPatrolCommand(
  unitIds: readonly number[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: MoveCommandOptions = {}
): ScheduledCommand {
  return {
    tick: options.tick ?? 1,
    playerId: options.playerId ?? 0,
    sequence: options.sequence ?? 1,
    intent: { type: 'PATROL', payload: { unitIds, x1, y1, x2, y2 } }
  }
}
