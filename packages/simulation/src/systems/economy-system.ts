import type { GameState } from '../state/state.js'
import { constructionSystem } from './construction-system.js'
import { gatherDepositSystem } from './gather-deposit-system.js'
import { repairSystem } from './repair-system.js'

/** Coordinates economy sub-systems at the frozen economy pipeline position. */
export function economySystem(state: GameState): void {
  gatherDepositSystem(state)
  repairSystem(state)
  constructionSystem(state)
}
