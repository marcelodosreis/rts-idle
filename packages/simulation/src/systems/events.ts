import type { EntityId, PlayerId } from '@rts/shared'

/**
 * Deterministic per-tick events (master plan §23.2, ADR-015). Derived from
 * state each tick, never persisted in the canonical snapshot; carried to the
 * client as `events[]` in the snapshot message. The union is frozen; adding a
 * variant is a deliberate protocol change.
 */
export type SimulationEvent =
  | {
      readonly type: 'attackFired'
      readonly attackerId: EntityId
      readonly targetId: EntityId
    }
  | {
      readonly type: 'damageDealt'
      readonly targetId: EntityId
      readonly amount: number
      readonly targetHp: number
    }
  | {
      readonly type: 'unitDied'
      readonly entityId: EntityId
      readonly owner: PlayerId
      readonly killerId: EntityId | null
    }
