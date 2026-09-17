import { applyCommand } from '../commands/apply-command.js'
import { CommandRejectedError, type ScheduledCommand } from '../contracts/commands.js'
import type { GameState } from '../state/state.js'

/**
 * System-order step 2: validate and apply scheduled commands. Every command
 * validates before writing (atomicity, master plan §10.3); a rejected command
 * throws {@link CommandRejectedError}, which is collected here and leaves the
 * state untouched beyond the tick advance.
 */
export function applyCommandsSystem(
  state: GameState,
  context: { readonly commands: readonly ScheduledCommand[]; readonly rejected: CommandRejectedError[] }
): void {
  for (const command of context.commands) {
    try {
      applyCommand(state, command)
    } catch (error) {
      if (error instanceof CommandRejectedError) {
        context.rejected.push(error)
      } else {
        throw error
      }
    }
  }
}
