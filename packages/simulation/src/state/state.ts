import type { RngState } from '@rts/shared'
import type { RulesIdentity } from '../contracts/simulation.js'
import type { World } from '../ecs/world.js'
import type { SimulationEvent } from '../systems/events.js'

export type Phase = 'RUNNING' | 'FINISHED'

export interface GameState {
  readonly tick: number
  readonly phase: Phase
  readonly identity: RulesIdentity
  readonly seed: number
  readonly rng: RngState
  readonly nextEntityId: number
  readonly world: World
  /** Transient per-tick events; never part of the canonical snapshot. */
  readonly events: readonly SimulationEvent[]
}
