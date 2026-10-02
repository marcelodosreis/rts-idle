import type { EntityId } from '@rts/shared'
import type { ScheduledCommand } from '../contracts/commands.js'
import type { RulesIdentity, TickResult } from '../contracts/simulation.js'
import type { WorldChangeSet } from '../ecs/world.js'
import type { ResourceAmount } from '../resources/resource-state.js'
import type { GameState, Phase } from '../state/state.js'
import type { SimulationObservation } from './observation.js'

/** A full serialized state plus its canonical hash (ADR-002/011). */
export interface SimulationSnapshot {
  readonly tick: number
  readonly hash: string
  readonly bytes: Uint8Array
}

/**
 * Public contract of a running simulation. `step` is the only mutation path
 * (single-writer model, ADR-001); everything else is read-only and returns
 * independent copies.
 */
export interface SimulationHost {
  step(commands?: readonly ScheduledCommand[]): TickResult
  exportSnapshot(): SimulationSnapshot
  inspectState(): GameState
  hashState(): string
  rulesIdentity(): RulesIdentity
  tick(): number
  phase(): Phase
  /**
   * Resource observations without materializing the GameState: `complete`
   * returns every amount (reconnect/initial state), otherwise only the
   * resources changed since the last `step` (O(changed)).
   */
  resources(complete: boolean): readonly ResourceAmount[]
  observe(completeResources: boolean, entityIds?: readonly EntityId[]): SimulationObservation
  changeCursor(): number
  changesSince(cursor: number): WorldChangeSet
}
