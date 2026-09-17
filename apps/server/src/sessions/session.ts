import type { SnapshotUnit } from '@rts/protocol'
import type { PlayerId } from '@rts/shared'
import {
  type CommandRejectedError,
  createSimulation,
  Owner,
  Position,
  type RulesIdentity,
  type ScheduledCommand,
  type SimulationHost,
  type SimulationOptions,
  type SimulationSnapshot,
  simulationFromSnapshot
} from '@rts/simulation'

export interface SessionResult {
  readonly tick: number
  readonly rejected: readonly CommandRejectedError[]
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
    return { tick: result.tick, rejected: result.rejected }
  }

  snapshot(): SimulationSnapshot {
    return this.simulation.exportSnapshot()
  }

  hashState(): string {
    return this.simulation.hashState()
  }

  projectUnits(): readonly SnapshotUnit[] {
    const world = this.simulation.inspectState().world
    const positions = world.store(Position)
    const owners = world.store(Owner)
    return world.aliveIds().map((id) => {
      const pos = positions.get(id)
      const owner = owners.get(id)
      if (pos === undefined || owner === undefined) {
        throw new Error(`GameSession: entity ${id} is missing position or owner`)
      }
      return { id, x: pos.x, y: pos.y, owner: owner.owner, kind: 'pawn' }
    })
  }

  identity(): RulesIdentity {
    return this.simulation.rulesIdentity()
  }
}
