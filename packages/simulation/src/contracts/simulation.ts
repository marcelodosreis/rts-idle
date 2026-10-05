import type { ResourceDefinition } from '@rts/shared'
import type { World } from '../ecs/world.js'
import type { NavigationInitialization } from '../navigation/navigation-state.js'
import type { PlacementMapBounds } from '../placement/building-placement.js'
import type { PlayerState } from '../state/state.js'

export type InitialPlayerState = Omit<
  PlayerState,
  'usedSupply' | 'reservedSupply' | 'supplyCap' | 'completedResearch'
> &
  Partial<Pick<PlayerState, 'usedSupply' | 'reservedSupply' | 'supplyCap' | 'completedResearch'>>

import type { SimulationEvent } from '../systems/events.js'
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
  readonly events: readonly SimulationEvent[]
}

export interface SimulationOptions {
  readonly seed: number
  readonly identity: RulesIdentity
  readonly initialWorld?: World
  readonly initialPlayers?: readonly InitialPlayerState[]
  readonly mapBounds?: PlacementMapBounds
  readonly resources?: readonly ResourceDefinition[]
  readonly navigation?: NavigationInitialization
}
