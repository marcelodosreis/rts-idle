import type { EntityId } from '../primitives/ids.js'
import type { PlayerId } from '../primitives/players.js'

/**
 * Deterministic per-tick simulation events (master plan §23.2, ADR-015).
 * Derived from state each tick, never persisted in the canonical snapshot;
 * carried to the client as `events[]` in the snapshot message. Shared by the
 * simulation (producer), the protocol (wire), and the renderer (feedback).
 * The union is frozen; adding a variant is a deliberate protocol change.
 */
export const SIMULATION_EVENT_TYPES = [
  'attackFired',
  'damageDealt',
  'healCast',
  'repairStopped',
  'unitDied',
  'movementBlocked'
] as const
export const REPAIR_STOP_REASONS = ['NO_GOLD'] as const
export const MOVEMENT_BLOCK_REASONS = ['COLLISION', 'UNREACHABLE'] as const
export type RepairStopReason = (typeof REPAIR_STOP_REASONS)[number]
export type MovementBlockReason = (typeof MOVEMENT_BLOCK_REASONS)[number]

export type SimulationEventType = (typeof SIMULATION_EVENT_TYPES)[number]

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
      readonly type: 'healCast'
      readonly healerId: EntityId
      readonly targetId: EntityId
      readonly amount: number
      readonly targetHp: number
    }
  | {
      readonly type: 'repairStopped'
      readonly workerId: EntityId
      readonly targetId: EntityId
      readonly reason: RepairStopReason
    }
  | {
      readonly type: 'unitDied'
      readonly entityId: EntityId
      readonly owner: PlayerId
      readonly killerId: EntityId | null
    }
  | {
      readonly type: 'movementBlocked'
      readonly unitId: EntityId
      readonly destinationX: number
      readonly destinationY: number
      readonly reason: MovementBlockReason
    }
