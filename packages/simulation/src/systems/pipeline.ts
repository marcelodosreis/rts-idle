import type { GameState } from '../state/state.js'
import { movementSystem } from './movement-system.js'

/**
 * Frozen system order (ADR-013). Order is part of the deterministic contract:
 * appending a step is a deliberate change, reordering is forbidden. Each system
 * mutates the private GameState — the single-writer model permits only `step()`
 * and the systems it invokes.
 */
export const SYSTEM_PIPELINE: readonly { readonly name: string; readonly system: (state: GameState) => void }[] =
  Object.freeze([{ name: 'movement', system: movementSystem }])

/** Runs the simulation systems in frozen order for one tick. */
export function runSystems(state: GameState): void {
  for (const step of SYSTEM_PIPELINE) {
    step.system(state)
  }
}
