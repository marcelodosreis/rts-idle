import type { ScheduledCommand } from '../contracts/commands.js'
import type { RulesIdentity, TickResult } from '../contracts/simulation.js'
import type { GameState } from '../state/state.js'

/** A full serialized state plus its canonical hash (ADR-002/011). */
export interface SimulationSnapshot {
  readonly tick: number
  readonly hash: string
  readonly bytes: Uint8Array
}

/**
 * Public contract of a running simulation. `step` is the only mutation path
 * (single-writer model, ADR-001); everything else is read-only and returns
 * independent copies.
 */
export interface SimulationHost {
  step(commands?: readonly ScheduledCommand[]): TickResult
  exportSnapshot(): SimulationSnapshot
  inspectState(): GameState
  hashState(): string
  rulesIdentity(): RulesIdentity
}
