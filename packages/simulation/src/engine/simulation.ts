import { applyCommand } from '../commands/apply-command.js'
import type { ScheduledCommand } from '../contracts/commands.js'
import { CommandRejectedError } from '../contracts/commands.js'
import type { RulesIdentity, TickResult } from '../contracts/simulation.js'
import { hashBytes, hashState } from '../snapshot/hash.js'
import { deserializeState, serializeState } from '../snapshot/serialize.js'
import type { GameState } from '../state/state.js'
import { runSystems } from '../systems/pipeline.js'
import type { SimulationHost, SimulationSnapshot } from './simulation-host.js'

/**
 * The simulation execution core. Owns the private GameState and is the single
 * writer: only `step()` (and the command systems it invokes) may mutate it
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
      tick: this.state.tick + 1,
      events: [],
      pendingDamage: new Map()
    }
    const rejected: CommandRejectedError[] = []
    for (const command of commands) {
      try {
        applyCommand(this.state, command)
      } catch (error) {
        if (error instanceof CommandRejectedError) {
          rejected.push(error)
        } else {
          throw error
        }
      }
    }
    runSystems(this.state)
    return { tick: this.state.tick, rejected, events: [...this.state.events] }
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
