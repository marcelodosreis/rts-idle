import { createRng, type RngState, START_ENTITY_ID } from '@rts/shared'
import { CommandRejectedError, type ScheduledCommand } from './contracts/commands.js'
import type { RulesIdentity, SimulationOptions, TickResult } from './contracts/simulation.js'
import { Owner, Position } from './ecs/components.js'
import { createWorld, type World } from './ecs/world.js'
import { formationOffset } from './formation.js'
import { deserializeState, hashBytes, hashState, serializeState } from './snapshot/serialize.js'
import type { GameState } from './state/state.js'

const MAX_UNITS_PER_COMMAND = 256

export interface SimulationSnapshot {
  readonly tick: number
  readonly hash: string
  readonly bytes: Uint8Array
}

export interface SimulationHost {
  step(commands?: readonly ScheduledCommand[]): TickResult
  exportSnapshot(): SimulationSnapshot
  inspectState(): GameState
  hashState(): string
}

export function createSimulation(options: SimulationOptions): SimulationHost {
  const rng = createRng(options.seed)
  const world = options.initialWorld ?? createWorld()
  const lastId = world.aliveIds().at(-1)
  const nextEntityId = lastId === undefined ? START_ENTITY_ID : lastId + 1
  const state: GameState = {
    tick: 0,
    phase: 'RUNNING',
    identity: options.identity,
    seed: options.seed,
    rng,
    nextEntityId,
    world
  }
  return new Simulation(state)
}

export function simulationFromSnapshot(snapshot: SimulationSnapshot): SimulationHost {
  const state = deserializeState(snapshot.bytes)
  return new Simulation(state)
}

class Simulation implements SimulationHost {
  private state: GameState

  constructor(state: GameState) {
    this.state = state
  }

  step(commands: readonly ScheduledCommand[] = []): TickResult {
    this.state = {
      ...this.state,
      tick: this.state.tick + 1
    }
    const rejected: CommandRejectedError[] = []
    for (const command of commands) {
      try {
        this.applyCommand(command)
      } catch (error) {
        if (error instanceof CommandRejectedError) {
          rejected.push(error)
        } else {
          throw error
        }
      }
    }
    return { tick: this.state.tick, rejected }
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

  private applyCommand(command: ScheduledCommand): void {
    switch (command.intent.type) {
      case 'MOVE':
        this.applyMove(command)
        return
    }
  }

  private applyMove(command: ScheduledCommand): void {
    const payload = command.intent.payload

    if (payload.unitIds.length === 0 || payload.unitIds.length > MAX_UNITS_PER_COMMAND) {
      throw new CommandRejectedError(
        'INVALID_PAYLOAD',
        command,
        `MOVE: unit count ${payload.unitIds.length} outside [1, ${MAX_UNITS_PER_COMMAND}]`
      )
    }
    if (!Number.isInteger(payload.x) || !Number.isInteger(payload.y)) {
      throw new CommandRejectedError('INVALID_PAYLOAD', command, 'MOVE: target must be integer fixed units')
    }

    const owners = this.state.world.store(Owner)
    for (const unitId of payload.unitIds) {
      if (!this.state.world.hasEntity(unitId)) {
        throw new CommandRejectedError('ENTITY_UNAVAILABLE', command, `MOVE: entity ${unitId} does not exist`)
      }
      const owner = owners.get(unitId)
      if (owner === undefined) {
        throw new CommandRejectedError('ENTITY_UNAVAILABLE', command, `MOVE: entity ${unitId} is not ownable`)
      }
      if (owner.owner !== command.playerId) {
        throw new CommandRejectedError(
          'NOT_OWNER',
          command,
          `MOVE: player ${command.playerId} does not own entity ${unitId}`
        )
      }
    }

    const positions = this.state.world.store(Position)
    const sorted = [...payload.unitIds].sort((a, b) => a - b)
    sorted.forEach((unitId, index) => {
      const offset = formationOffset(index)
      positions.set(unitId, { x: payload.x + offset.dx, y: payload.y + offset.dy })
    })
  }
}

export type { RngState, RulesIdentity, World }
