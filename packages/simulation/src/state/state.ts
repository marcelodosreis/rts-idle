import type { CastleTier, EntityId, PlayerId, ResearchType, RngState } from '@rts/shared'
import type { RulesIdentity } from '../contracts/simulation.js'
import type { World } from '../ecs/world.js'
import type { PlacementMapBounds } from '../placement/building-placement.js'
import type { SimulationEvent } from '../systems/events.js'

export type Phase = 'RUNNING' | 'FINISHED'

/**
 * One of the four competitive slots. `defeated` flips when the player
 * surrenders or the victory system eliminates them; `gold` is the mineral
 * wallet and supply is authoritative economy state projected to the client.
 */
export interface PlayerState {
  readonly id: PlayerId
  defeated: boolean
  gold: number
  usedSupply: number
  reservedSupply: number
  supplyCap: number
  completedResearch: readonly ResearchType[]
  highestCastleTierReached: CastleTier
}

/**
 * Damage accumulated against a target during a single combat step. Held in a
 * per-tick buffer so that mutual attacks resolve simultaneously (master plan
 * P1.06): both combatants deal damage even when each would kill the other.
 */
export interface DamageAccumulation {
  readonly amount: number
  readonly attackerId: EntityId | null
}

export interface GameState {
  readonly tick: number
  phase: Phase
  readonly identity: RulesIdentity
  readonly seed: number
  readonly rng: RngState
  nextEntityId: number
  readonly players: readonly PlayerState[]
  readonly mapBounds: PlacementMapBounds
  readonly world: World
  /** Transient per-tick events; never part of the canonical snapshot. */
  readonly events: SimulationEvent[]
  /** Transient per-tick damage buffer (combat step 13, death step 14). */
  readonly pendingDamage: Map<EntityId, DamageAccumulation>
}
