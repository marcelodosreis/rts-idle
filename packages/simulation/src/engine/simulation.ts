import type { ScheduledCommand } from '../contracts/commands.js'
import type { RulesIdentity, TickResult } from '../contracts/simulation.js'
import { hashBytes, hashState } from '../snapshot/hash.js'
import { deserializeState, serializeState } from '../snapshot/serialize.js'
import type { GameState } from '../state/state.js'
import { SYSTEM_ORDER, type SystemContext } from '../systems/pipeline.js'
import type { SimulationHost, SimulationSnapshot } from './simulation-host.js'

/**
 * The simulation execution core. Owns the private GameState and is the single
 * writer: only `step()` (and the systems it invokes) may mutate it
 * (authorized mutability exception, ADR-001 / AGENTS.md).
 */
export class Simulation implements SimulationHost {
  private state: GameState

  constructor(state: GameState) {
    this.state = state
  }

  step(commands: readonly ScheduledCommand[] = []): TickResult {
    this.state = {
      ...this.state,
      tick: this.state.tick + 1
    }
    const context: SystemContext = { commands, rejected: [], events: [] }
    for (const system of SYSTEM_ORDER) {
      system(this.state, context)
    }
    return { tick: this.state.tick, rejected: context.rejected, events: context.events }
  }

  exportSnapshot(): SimulationSnapshot {
    const bytes = serializeState(this.state)
    return {
      tick: this.state.tick,
      hash: hashBytes(bytes),
      bytes
    }
  }

  inspectState(): GameState {
    return deserializeState(serializeState(this.state))
  }

  hashState(): string {
    return hashState(this.state)
  }

  rulesIdentity(): RulesIdentity {
    return this.state.identity
  }
}
