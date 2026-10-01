import type { Fixed } from '../primitives/fixed.js'
import type { EntityId } from '../primitives/ids.js'
import type { ResearchType } from './research.js'
import type { ResourceId } from './resources.js'
import type { TrainableUnitKind } from './unit-kind.js'

export interface MovePayload {
  readonly unitIds: readonly EntityId[]
  readonly x: Fixed
  readonly y: Fixed
}

export interface StopPayload {
  readonly unitIds: readonly EntityId[]
}

export interface HoldPayload {
  readonly unitIds: readonly EntityId[]
}

export interface PatrolPayload {
  readonly unitIds: readonly EntityId[]
  readonly x: Fixed
  readonly y: Fixed
}

export interface AttackPayload {
  readonly unitIds: readonly EntityId[]
  readonly targetId: EntityId
}

export interface AttackMovePayload {
  readonly unitIds: readonly EntityId[]
  readonly x: Fixed
  readonly y: Fixed
}

export interface GatherPayload {
  readonly unitIds: readonly EntityId[]
  readonly resourceId: ResourceId
}

export interface DepositPayload {
  readonly unitIds: readonly EntityId[]
  readonly buildingId: EntityId
}

export interface RepairPayload {
  readonly unitIds: readonly EntityId[]
  readonly targetId: EntityId
}

export interface HealPayload {
  readonly unitIds: readonly EntityId[]
  readonly targetId: EntityId
}

export interface ResearchPayload {
  readonly monasteryId: EntityId
  readonly researchType: ResearchType
}

export interface CancelResearchPayload {
  readonly monasteryId: EntityId
  readonly queueIndex: number
}

export interface UpgradeCastlePayload {
  readonly castleId: EntityId
}

export const BUILDING_TYPES = ['CASTLE', 'BARRACKS', 'ARCHERY', 'MONASTERY', 'HOUSE', 'TOWER'] as const

export type BuildingType = (typeof BUILDING_TYPES)[number]

/** Closed lifecycle registry for a building/foundation. */
export const BUILDING_STATUSES = ['FOUNDATION', 'UNDER_CONSTRUCTION', 'COMPLETED'] as const

export type BuildingStatus = (typeof BUILDING_STATUSES)[number]

/** Closed registry of command discriminants (strong-typing policy). */
export const COMMAND_TYPES = [
  'MOVE',
  'STOP',
  'HOLD',
  'PATROL',
  'ATTACK',
  'ATTACK_MOVE',
  'GATHER',
  'DEPOSIT',
  'REPAIR',
  'HEAL',
  'BUILD',
  'UPGRADE_CASTLE',
  'CANCEL_CONSTRUCTION',
  'TRAIN',
  'CANCEL_PRODUCTION',
  'RESEARCH',
  'CANCEL_RESEARCH',
  'RALLY',
  'SURRENDER'
] as const

export type CommandType = (typeof COMMAND_TYPES)[number]

export interface BuildPayload {
  readonly unitId: EntityId
  readonly buildingType: BuildingType
  readonly x: number
  readonly y: number
}

export interface CancelConstructionPayload {
  readonly buildingId: EntityId
}

export interface TrainPayload {
  readonly producerId: EntityId
  readonly unitKind: TrainableUnitKind
}

export interface CancelProductionPayload {
  readonly producerId: EntityId
  readonly queueIndex: number
}

export interface RallyPayload {
  readonly producerId: EntityId
  readonly x: Fixed
  readonly y: Fixed
}

/** SURRENDER has no payload: the issuing player concedes their own match. */
export type SurrenderPayload = Record<string, never>

/**
 * Authoritative command intent (master plan P1.01). Shared by the simulation
 * (executor), the protocol (wire), and the server (transport) so a command is
 * defined once. Payloads only reference shared primitives; scheduling
 * (`tick`/`playerId`/`sequence`) lives in the simulation's `ScheduledCommand`.
 * The union is frozen — adding a variant is a deliberate protocol change.
 */
export type CommandIntent =
  | { readonly type: 'MOVE'; readonly payload: MovePayload }
  | { readonly type: 'STOP'; readonly payload: StopPayload }
  | { readonly type: 'HOLD'; readonly payload: HoldPayload }
  | { readonly type: 'PATROL'; readonly payload: PatrolPayload }
  | { readonly type: 'ATTACK'; readonly payload: AttackPayload }
  | { readonly type: 'ATTACK_MOVE'; readonly payload: AttackMovePayload }
  | { readonly type: 'GATHER'; readonly payload: GatherPayload }
  | { readonly type: 'DEPOSIT'; readonly payload: DepositPayload }
  | { readonly type: 'REPAIR'; readonly payload: RepairPayload }
  | { readonly type: 'HEAL'; readonly payload: HealPayload }
  | { readonly type: 'BUILD'; readonly payload: BuildPayload }
  | { readonly type: 'UPGRADE_CASTLE'; readonly payload: UpgradeCastlePayload }
  | { readonly type: 'CANCEL_CONSTRUCTION'; readonly payload: CancelConstructionPayload }
  | { readonly type: 'TRAIN'; readonly payload: TrainPayload }
  | { readonly type: 'CANCEL_PRODUCTION'; readonly payload: CancelProductionPayload }
  | { readonly type: 'RESEARCH'; readonly payload: ResearchPayload }
  | { readonly type: 'CANCEL_RESEARCH'; readonly payload: CancelResearchPayload }
  | { readonly type: 'RALLY'; readonly payload: RallyPayload }
  | { readonly type: 'SURRENDER'; readonly payload: SurrenderPayload }
