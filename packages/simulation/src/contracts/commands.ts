import type { EntityId, Fixed, PlayerId } from '@rts/shared'

/** Order queue mode: replace the movement queue or append (master plan §10.1). */
export type OrderMode = 'replace' | 'append'

export interface MovePayload {
  readonly unitIds: readonly EntityId[]
  readonly x: Fixed
  readonly y: Fixed
  readonly mode?: OrderMode
}

export interface AttackPayload {
  readonly unitIds: readonly EntityId[]
  readonly targetId: EntityId
  readonly mode?: OrderMode
}

export interface AttackMovePayload {
  readonly unitIds: readonly EntityId[]
  readonly x: Fixed
  readonly y: Fixed
  readonly mode?: OrderMode
}

export interface StopPayload {
  readonly unitIds: readonly EntityId[]
}

export interface HoldPayload {
  readonly unitIds: readonly EntityId[]
}

export interface PatrolPayload {
  readonly unitIds: readonly EntityId[]
  readonly x1: Fixed
  readonly y1: Fixed
  readonly x2: Fixed
  readonly y2: Fixed
  readonly mode?: OrderMode
}

export interface GatherPayload {
  readonly workerIds: readonly EntityId[]
  readonly resourceId: EntityId
  readonly mode?: OrderMode
}

export interface ReturnCargoPayload {
  readonly workerIds: readonly EntityId[]
}

export interface BuildPayload {
  readonly workerId: EntityId
  readonly definitionId: string
  readonly tileX: number
  readonly tileY: number
}

export interface TrainPayload {
  readonly producerId: EntityId
  readonly unitDefinitionId: string
}

export interface ResearchPayload {
  readonly laboratoryId: EntityId
  readonly researchId: string
}

export interface RallyPayload {
  readonly producerId: EntityId
  readonly x: Fixed
  readonly y: Fixed
}

export interface RepairPayload {
  readonly workerIds: readonly EntityId[]
  readonly targetId: EntityId
  readonly mode?: OrderMode
}

export interface CancelConstructionPayload {
  readonly foundationId: EntityId
}

export interface CancelProductionPayload {
  readonly producerId: EntityId
  readonly queueIndex: number
}

export interface CancelResearchPayload {
  readonly laboratoryId: EntityId
}

export interface UseAbilityPayload {
  readonly unitId: EntityId
  readonly abilityId: string
  readonly targetId?: EntityId
}

export type CommandIntent =
  | { readonly type: 'MOVE'; readonly payload: MovePayload }
  | { readonly type: 'ATTACK'; readonly payload: AttackPayload }
  | { readonly type: 'ATTACK_MOVE'; readonly payload: AttackMovePayload }
  | { readonly type: 'STOP'; readonly payload: StopPayload }
  | { readonly type: 'HOLD'; readonly payload: HoldPayload }
  | { readonly type: 'PATROL'; readonly payload: PatrolPayload }
  | { readonly type: 'GATHER'; readonly payload: GatherPayload }
  | { readonly type: 'RETURN_CARGO'; readonly payload: ReturnCargoPayload }
  | { readonly type: 'BUILD'; readonly payload: BuildPayload }
  | { readonly type: 'TRAIN'; readonly payload: TrainPayload }
  | { readonly type: 'RESEARCH'; readonly payload: ResearchPayload }
  | { readonly type: 'RALLY'; readonly payload: RallyPayload }
  | { readonly type: 'REPAIR'; readonly payload: RepairPayload }
  | { readonly type: 'CANCEL_CONSTRUCTION'; readonly payload: CancelConstructionPayload }
  | { readonly type: 'CANCEL_PRODUCTION'; readonly payload: CancelProductionPayload }
  | { readonly type: 'CANCEL_RESEARCH'; readonly payload: CancelResearchPayload }
  | { readonly type: 'USE_ABILITY'; readonly payload: UseAbilityPayload }
  | { readonly type: 'SURRENDER'; readonly payload: Record<string, never> }

/** The canonical command envelope (master plan §10.2). */
export interface ScheduledCommand {
  readonly tick: number
  readonly playerId: PlayerId
  readonly sequence: number
  readonly intent: CommandIntent
}

/** All error codes a command can be rejected with (master plan §10.5). */
export type CommandErrorCode =
  | 'INVALID_PAYLOAD'
  | 'NOT_ROOM_MEMBER'
  | 'INVALID_PHASE'
  | 'NOT_OWNER'
  | 'ENTITY_UNAVAILABLE'
  | 'TARGET_UNAVAILABLE'
  | 'INSUFFICIENT_RESOURCES'
  | 'SUPPLY_BLOCKED'
  | 'QUEUE_FULL'
  | 'TECH_REQUIREMENT'
  | 'INVALID_PLACEMENT'
  | 'ORDER_NOT_SUPPORTED'
  | 'RATE_LIMITED'

export class CommandRejectedError extends Error {
  readonly code: CommandErrorCode
  readonly command: ScheduledCommand

  constructor(code: CommandErrorCode, command: ScheduledCommand, message: string) {
    super(message)
    this.name = 'CommandRejectedError'
    this.code = code
    this.command = command
  }
}
