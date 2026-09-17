import type { CommandRejectedError, ScheduledCommand } from '../contracts/commands.js'
import type { SimulationEvent } from '../contracts/events.js'
import type { GameState } from '../state/state.js'
import { applyCommandsSystem } from './commands-system.js'

/** Per-tick execution context handed to every system (ADR-013). */
export interface SystemContext {
  /** Commands scheduled for this tick (validated at step 2, applied in order). */
  readonly commands: readonly ScheduledCommand[]
  /** Rejected commands collected by the command system (atomicity, §10.3). */
  readonly rejected: CommandRejectedError[]
  /** Event buffer filled by systems; emitted at step 19. */
  readonly events: SimulationEvent[]
}

/** A single system of the frozen per-tick order (master plan §9.2 / ADR-013). */
export type System = (state: GameState, context: SystemContext) => void

function noop(): void {
  // Reserved system slot: not yet implemented in this phase.
}

/**
 * The frozen per-tick system order (ADR-013). Each entry is one step of
 * master plan §9.2; steps for later phases are explicit no-ops so the order is
 * contract, and future systems slot into their step without renumbering.
 */
export const SYSTEM_ORDER: readonly System[] = [
  // 1. Expire temporary effects (abilities arrive with Phase 2 content).
  noop,
  // 2. Validate and apply scheduled commands (atomicity, §10.3).
  applyCommandsSystem,
  // 3. Update orders and request navigation (Phase 1 orders, task A6).
  noop,
  // 4. Run the pathfinding budget (Phase 3).
  noop,
  // 5. Resolve movement and collision (Phase 1 straight-line, task A4/A5).
  noop,
  // 6. Gather, deposit, and repair (Phase 2).
  noop,
  // 7. Advance construction (Phase 2).
  noop,
  // 8. Advance research (Phase 2).
  noop,
  // 9. Update supply and advance production (Phase 2).
  noop,
  // 10. Update vision for target acquisition (Phase 1 combat, task A10).
  noop,
  // 11. Select attacks and create damage events (Phase 1 combat, task A9).
  noop,
  // 12. Advance pre-existing projectiles (Phase 3).
  noop,
  // 13. Apply accumulated damage (Phase 1, task A11).
  noop,
  // 14. Resolve deaths and clean up references (Phase 1, task A11).
  noop,
  // 15. Recalculate supply after deaths (Phase 2).
  noop,
  // 16. Update final vision and player memory (Phase 3).
  noop,
  // 17. Evaluate defeat, victory, and duration limit (Phase 1, task A12).
  noop,
  // 18. Check invariants per mode (Phase 1, task A13).
  noop,
  // 19. Produce events and, when configured, the hash (buffer sealed by engine).
  noop
]
