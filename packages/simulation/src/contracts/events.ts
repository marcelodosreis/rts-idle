import type { EntityId, Fixed } from '@rts/shared'

/**
 * Per-tick visual feedback events (ADR-015, master plan §23.2). Emitted by the
 * simulation at system-order step 19, derived from the tick's state transition:
 * they are deterministic, replay-safe (never persisted in the canonical
 * snapshot), and filtered by allowed observation (fog) from Phase 3 on.
 */
export type SimulationEvent =
  | {
      readonly type: 'attackFired'
      readonly attackerId: EntityId
      readonly targetId: EntityId
      readonly x: Fixed
      readonly y: Fixed
    }
  | {
      readonly type: 'damageDealt'
      readonly targetId: EntityId
      readonly amount: number
      readonly x: Fixed
      readonly y: Fixed
    }
  | {
      readonly type: 'unitDied'
      readonly id: EntityId
      readonly x: Fixed
      readonly y: Fixed
    }
