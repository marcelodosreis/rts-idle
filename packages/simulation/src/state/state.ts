import type { EntityId, PlayerId, PlayerResources, ResearchType, RngState } from '@rts/shared'
import type { ScheduledCommand } from '../contracts/commands.js'
import type { RulesIdentity } from '../contracts/simulation.js'
import type { World } from '../ecs/world.js'
import type { NavigationState } from '../navigation/navigation-state.js'
import type { PlacementMapBounds } from '../placement/building-placement.js'
import type { ResourceState } from '../resources/resource-state.js'
import type { SimulationEvent } from '../systems/events.js'

export type Phase = 'RUNNING' | 'FINISHED'

/**
 * One of the four competitive slots. `defeated` flips when the player
 * surrenders or the victory system eliminates them; resources and supply are
 * authoritative economy state projected to the client.
 */
export interface PlayerState {
  readonly id: PlayerId
  defeated: boolean
  resources: PlayerResources
  usedSupply: number
  reservedSupply: number
  supplyCap: number
  completedResearch: readonly ResearchType[]
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
  /** Compact state for map-authored resources; passive resources never enter World. */
  readonly resources: ResourceState
  /** Canonical grid definition and bounded path searches. */
  readonly navigation: NavigationState
  readonly world: World
  /** Future commands are authoritative state and survive snapshot/restore. */
  readonly pendingCommands: ScheduledCommand[]
  /** Transient per-tick events; never part of the canonical snapshot. */
  readonly events: SimulationEvent[]
  /** Transient per-tick damage buffer (combat step 13, death step 14). */
  readonly pendingDamage: Map<EntityId, DamageAccumulation>
}
