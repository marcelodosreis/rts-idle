import type { EntityId, Fixed, PlayerId } from '@rts/shared'

export interface MovePayload {
  readonly unitIds: readonly EntityId[]
  readonly x: Fixed
  readonly y: Fixed
}

export type CommandIntent = {
  readonly type: 'MOVE'
  readonly payload: MovePayload
}

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
