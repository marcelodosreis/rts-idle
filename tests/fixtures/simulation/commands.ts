import type { PlayerId } from '@rts/shared'
import { Movement, type ScheduledCommand, type SimulationHost } from '@rts/simulation'

/**
 * Steps the simulation until every unit's Movement is cleared (arrival), or
 * fails after `maxSteps`. MOVE commands animate over multiple ticks, so tests
 * that assert arrival must advance the simulation.
 */
export function runUntilArrived(sim: SimulationHost, ids: readonly number[], maxSteps = 500): void {
  for (let step = 0; step < maxSteps; step += 1) {
    const movements = sim.inspectState().world.store(Movement)
    if (ids.every((id) => movements.get(id) === undefined)) {
      return
    }
    sim.step([])
  }
  throw new Error(`units did not arrive within ${maxSteps} ticks`)
}

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
