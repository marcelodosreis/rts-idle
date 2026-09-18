import type { EntityId, Fixed, PlayerId } from '@rts/shared'

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

export type CommandIntent =
  | { readonly type: 'MOVE'; readonly payload: MovePayload }
  | { readonly type: 'STOP'; readonly payload: StopPayload }
  | { readonly type: 'HOLD'; readonly payload: HoldPayload }
  | { readonly type: 'PATROL'; readonly payload: PatrolPayload }
  | { readonly type: 'ATTACK'; readonly payload: AttackPayload }
  | { readonly type: 'ATTACK_MOVE'; readonly payload: AttackMovePayload }

export interface ScheduledCommand {
  readonly tick: number
  readonly playerId: PlayerId
  readonly sequence: number
  readonly intent: CommandIntent
}

export type CommandErrorCode = 'INVALID_PAYLOAD' | 'INVALID_PHASE' | 'NOT_OWNER' | 'ENTITY_UNAVAILABLE'

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
