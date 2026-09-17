import type { World } from '../ecs/world.js'
import type { PlayerState } from '../state/players.js'
import type { CommandRejectedError } from './commands.js'
import type { SimulationEvent } from './events.js'

export interface RulesIdentity {
  readonly simulationVersion: string
  readonly rulesetVersion: string
  readonly rulesetHash: string
  readonly mapId: string
  readonly mapHash: string
}

export interface TickResult {
  readonly tick: number
  readonly rejected: readonly CommandRejectedError[]
  /** Visual feedback events produced by this tick (step 19). */
  readonly events: readonly SimulationEvent[]
}

export interface SimulationOptions {
  readonly seed: number
  readonly identity: RulesIdentity
  readonly initialWorld?: World
  /** Per-slot initial overrides; missing slots keep the baseline (master plan §11.1). */
  readonly players?: readonly Partial<PlayerState>[]
}
