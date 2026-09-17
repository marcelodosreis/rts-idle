import type { World } from '../ecs/world.js'
import type { CommandRejectedError } from './commands.js'

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
}

export interface SimulationOptions {
  readonly seed: number
  readonly identity: RulesIdentity
  readonly initialWorld?: World
}
