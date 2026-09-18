import type { PlayerId, RngState } from '@rts/shared'
import type { RulesIdentity } from '../contracts/simulation.js'
import type { World } from '../ecs/world.js'
import type { SimulationEvent } from '../systems/events.js'

export type Phase = 'RUNNING' | 'FINISHED'

/**
 * One of the four competitive slots. `defeated` flips when the player
 * surrenders or the victory system eliminates them; `gold` is the wallet (the
 * economy systems land in Phase 2, the field is reserved here).
 */
export interface PlayerState {
  readonly id: PlayerId
  defeated: boolean
  readonly gold: number
}

export interface GameState {
  readonly tick: number
  readonly phase: Phase
  readonly identity: RulesIdentity
  readonly seed: number
  readonly rng: RngState
  readonly nextEntityId: number
  readonly players: readonly PlayerState[]
  readonly world: World
  /** Transient per-tick events; never part of the canonical snapshot. */
  readonly events: readonly SimulationEvent[]
}
