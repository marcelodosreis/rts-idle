import type { MatchPhase } from '@rts/protocol'
import type { EntityId, PlayerId, SimulationEvent } from '@rts/shared'
import {
  type CommandRejectedError,
  createSimulation,
  type RulesIdentity,
  type ScheduledCommand,
  type SimulationHost,
  type SimulationObservation,
  type SimulationOptions,
  type SimulationSnapshot,
  simulationFromSnapshot,
  type WorldChangeSet
} from '@rts/simulation'

export interface SessionResult {
  readonly tick: number
  readonly rejected: readonly CommandRejectedError[]
  readonly events: readonly SimulationEvent[]
}

export const MAX_PENDING_COMMANDS_PER_SESSION = 128

/**
 * Authoritative game session: the only path through which the transport can
 * submit commands and observe the running simulation (single-writer boundary).
 */
export class GameSession {
  private simulation: SimulationHost
  private readonly pending: ScheduledCommand[] = []

  private constructor(simulation: SimulationHost) {
    this.simulation = simulation
  }

  static create(options: SimulationOptions): GameSession {
    return new GameSession(createSimulation(options))
  }

  static fromSnapshot(snapshot: SimulationSnapshot): GameSession {
    return new GameSession(simulationFromSnapshot(snapshot))
  }

  submit(asPlayerId: PlayerId, commands: readonly ScheduledCommand[]): void {
    if (this.pending.length + commands.length > MAX_PENDING_COMMANDS_PER_SESSION) {
      throw new Error(`GameSession: pending command limit ${MAX_PENDING_COMMANDS_PER_SESSION} exceeded`)
    }
    for (const command of commands) {
      if (command.playerId !== asPlayerId) {
        throw new Error(`GameSession: player ${asPlayerId} cannot submit commands for player ${command.playerId}`)
      }
      this.pending.push(command)
    }
  }

  advance(): SessionResult {
    const result = this.simulation.step(this.pending)
    this.pending.length = 0
    return { tick: result.tick, rejected: result.rejected, events: result.events }
  }

  snapshot(): SimulationSnapshot {
    return this.simulation.exportSnapshot()
  }

  tick(): number {
    return this.simulation.tick()
  }

  /** Current match phase ('RUNNING' or 'FINISHED'), projected for the client. */
  phase(): MatchPhase {
    return this.simulation.phase()
  }

  hashState(): string {
    return this.simulation.hashState()
  }

  observe(completeResources: boolean, entityIds?: readonly EntityId[]): SimulationObservation {
    return this.simulation.observe(completeResources, entityIds)
  }

  changeCursor(): number {
    return this.simulation.changeCursor()
  }

  changesSince(cursor: number): WorldChangeSet {
    return this.simulation.changesSince(cursor)
  }

  identity(): RulesIdentity {
    return this.simulation.rulesIdentity()
  }
}
