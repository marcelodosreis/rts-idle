import type { EntityId, PlayerId } from '@rts/shared'
import { applyCommand } from '../commands/apply-command.js'
import type { ScheduledCommand } from '../contracts/commands.js'
import { CommandRejectedError } from '../contracts/commands.js'
import type { RulesIdentity, TickResult } from '../contracts/simulation.js'
import { Kind, Owner, Position } from '../ecs/components.js'
import type { WorldChangeSet } from '../ecs/world.js'
import type { ResourceAmount } from '../resources/resource-state.js'
import { compareScheduledCommands } from '../snapshot/commands.js'
import { hashBytes, hashState } from '../snapshot/hash.js'
import { serializeState } from '../snapshot/serialize.js'
import { cloneGameState } from '../state/clone-state.js'
import type { GameState, Phase } from '../state/state.js'
import { runSystems } from '../systems/pipeline.js'
import { createSimulationObservation } from './observation.js'
import type { SimulationHost, SimulationSnapshot } from './simulation-host.js'

/**
 * The simulation execution core. Owns the private GameState and is the single
 * writer: only `step()` (and the command systems it invokes) may mutate it
 * (authorized mutability exception, ADR-001 / AGENTS.md).
 */
export class Simulation implements SimulationHost {
  private state: GameState
  private readonly researchSignatures: Map<PlayerId, string>

  constructor(state: GameState) {
    this.state = state
    this.researchSignatures = new Map(state.players.map((player) => [player.id, researchSignature(player)]))
  }

  step(commands: readonly ScheduledCommand[] = []): TickResult {
    this.state = {
      ...this.state,
      tick: this.state.tick + 1,
      events: [],
      pendingDamage: new Map()
    }
    this.state.resources.beginTick()
    this.state.pendingCommands.push(...commands)
    const due: ScheduledCommand[] = []
    const future: ScheduledCommand[] = []
    for (const command of this.state.pendingCommands) {
      if (command.tick <= this.state.tick) {
        due.push(command)
      } else {
        future.push(command)
      }
    }
    this.state.pendingCommands.length = 0
    this.state.pendingCommands.push(...future.sort(compareScheduledCommands))
    due.sort(compareScheduledCommands)
    const rejected: CommandRejectedError[] = []
    for (const command of due) {
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
    this.markPlayerDependentEntitiesDirty()
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
    return cloneGameState(this.state)
  }

  hashState(): string {
    return hashState(this.state)
  }

  rulesIdentity(): RulesIdentity {
    return this.state.identity
  }

  tick(): number {
    return this.state.tick
  }

  phase(): Phase {
    return this.state.phase
  }

  resources(complete: boolean): readonly ResourceAmount[] {
    return complete ? this.state.resources.all() : this.state.resources.changed()
  }

  observe(completeResources: boolean, entityIds?: readonly EntityId[]): ReturnType<typeof createSimulationObservation> {
    return createSimulationObservation(this.state, completeResources, entityIds)
  }

  changeCursor(): number {
    return this.state.world.changeCursor()
  }

  changesSince(cursor: number): WorldChangeSet {
    return this.state.world.changesSince(cursor)
  }

  private markPlayerDependentEntitiesDirty(): void {
    const changedPlayerIds = new Set<PlayerId>()
    for (const player of this.state.players) {
      const signature = researchSignature(player)
      if (this.researchSignatures.get(player.id) !== signature) {
        this.researchSignatures.set(player.id, signature)
        changedPlayerIds.add(player.id)
      }
    }
    if (changedPlayerIds.size === 0) {
      return
    }
    const owners = this.state.world.store(Owner)
    for (const entityId of this.state.world.query(Kind, Owner, Position)) {
      if (changedPlayerIds.has(owners.get(entityId)!.owner)) {
        this.state.world.markDirty(entityId)
      }
    }
  }
}

function researchSignature(player: GameState['players'][number]): string {
  return player.completedResearch.join(',')
}
