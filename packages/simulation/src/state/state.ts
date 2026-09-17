import type { RngState } from '@rts/shared'
import type { RulesIdentity } from '../contracts/simulation.js'
import type { World } from '../ecs/world.js'
import type { PlayerState } from './players.js'

export type Phase = 'RUNNING' | 'FINISHED'

export interface GameState {
  readonly tick: number
  readonly phase: Phase
  readonly identity: RulesIdentity
  readonly seed: number
  readonly rng: RngState
  readonly nextEntityId: number
  readonly players: readonly PlayerState[]
  readonly world: World
}
