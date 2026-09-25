import type { CommandErrorCode, ScheduledCommand } from '../contracts/commands.js'
import { CommandRejectedError } from '../contracts/commands.js'

export function reject(command: ScheduledCommand, code: CommandErrorCode, message: string): never {
  throw new CommandRejectedError(code, command, message)
}
