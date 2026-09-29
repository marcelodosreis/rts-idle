import type { MatchPhase, SnapshotBuilding, SnapshotMineralNode, SnapshotPlayer, SnapshotUnit } from '@rts/protocol'
import type { PlayerId, SimulationEvent } from '@rts/shared'
import {
  type CommandRejectedError,
  createSimulation,
  type RulesIdentity,
  type ScheduledCommand,
  type SimulationHost,
  type SimulationOptions,
  type SimulationSnapshot,
  simulationFromSnapshot
} from '@rts/simulation'
import { projectBuildings, projectMineralNodes, projectPlayers, projectUnits } from './projections/index.js'

export interface SessionResult {
  readonly tick: number
  readonly rejected: readonly CommandRejectedError[]
  readonly events: readonly SimulationEvent[]
}

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

  /** Current match phase ('RUNNING' or 'FINISHED'), projected for the client. */
  phase(): MatchPhase {
    return this.simulation.inspectState().phase
  }

  hashState(): string {
    return this.simulation.hashState()
  }

  projectUnits(): readonly SnapshotUnit[] {
    const state = this.simulation.inspectState()
    return projectUnits(state.world, state.players)
  }

  projectBuildings(): readonly SnapshotBuilding[] {
    return projectBuildings(this.simulation.inspectState().world)
  }

  projectMineralNodes(): readonly SnapshotMineralNode[] {
    return projectMineralNodes(this.simulation.inspectState().world)
  }

  projectPlayers(): readonly SnapshotPlayer[] {
    const state = this.simulation.inspectState()
    return projectPlayers(state.players, state.world)
  }

  identity(): RulesIdentity {
    return this.simulation.rulesIdentity()
  }
}
