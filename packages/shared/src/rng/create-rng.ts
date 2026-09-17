import type { RngState } from './rng-state.js'
import { splitmix32 } from './splitmix32.js'

/**
 * Non-zero replacement word for the forbidden all-zero state.
 * Any non-zero uint32 works; the golden-ratio fraction is reused for symmetry
 * with the SplitMix32 increment.
 */
const ZERO_STATE_GUARD = 0x9e3779b9

/**
 * Creates the initial xoshiro128** state from a single integer seed.
 *
 * Derives four words via SplitMix32 and replaces the first word if the state
 * would be all-zero (an absorbing state for xoshiro128**, see rng-state.ts).
 */
export function createRng(seed: number): RngState {
  const generate = splitmix32(seed)
  let s0 = generate()
  const s1 = generate()
  const s2 = generate()
  const s3 = generate()
  if ((s0 | s1 | s2 | s3) === 0) {
    s0 = ZERO_STATE_GUARD
  }
  return { s0, s1, s2, s3 }
}
