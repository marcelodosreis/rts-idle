import { checkInvariants } from '../invariants/check-invariants.js'
import type { GameState } from '../state/state.js'
import { combatSystem } from './combat-system.js'
import { deathSystem } from './death-system.js'
import { economySystem } from './economy-system.js'
import { movementSystem } from './movement-system.js'
import { ordersSystem } from './orders-system.js'
import { productionSystem } from './production-system.js'
import { updateSupply } from './supply-system.js'
import { victorySystem } from './victory-system.js'

/**
 * Frozen system order (ADR-013). Order is part of the deterministic contract:
 * appending a step is a deliberate change, reordering is forbidden. Each system
 * mutates the private GameState — the single-writer model permits only `step()`
 * and the systems it invokes. The invariant step runs last and never mutates.
 */
export const SYSTEM_PIPELINE: readonly { readonly name: string; readonly system: (state: GameState) => void }[] =
  Object.freeze([
    { name: 'orders', system: ordersSystem },
    { name: 'movement', system: movementSystem },
    { name: 'economy', system: economySystem },
    { name: 'combat', system: combatSystem },
    { name: 'death', system: deathSystem },
    { name: 'supply', system: updateSupply },
    { name: 'production', system: productionSystem },
    { name: 'victory', system: victorySystem },
    { name: 'invariants', system: checkInvariants }
  ])

/** Runs the simulation systems in frozen order for one tick. */
export function runSystems(state: GameState): void {
  for (const step of SYSTEM_PIPELINE) {
    step.system(state)
  }
}
