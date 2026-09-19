import type { CommandIntent, PlayerId } from '@rts/shared'

export type {
  AttackMovePayload,
  AttackPayload,
  CommandIntent,
  GatherPayload,
  HoldPayload,
  MovePayload,
  PatrolPayload,
  StopPayload,
  SurrenderPayload
} from '@rts/shared'

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
