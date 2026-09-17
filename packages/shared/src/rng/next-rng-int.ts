import { rngNext } from './next-rng.js'
import { type RngIntResult, type RngState, UINT32_MAX } from './rng-state.js'

/**
 * Draws a uniform integer in `[0, maxExclusive)` without modulo bias.
 *
 * Rejection sampling: `rngNext` emits uint32 values, and taking `value % max`
 * directly would bias low remainders because 2^32 is not a multiple of `max`.
 * We reject values in the top partial bucket `[limit, 2^32)` and keep the
 * rest, so the accepted range is an exact multiple of `max`.
 *
 * The loop always terminates: `maxExclusive` is at most 2^32 - 1, so
 * `limit > 0` and every draw has a positive probability of being accepted.
 */
export function rngNextInt(state: RngState, maxExclusive: number): RngIntResult {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error(`rngNextInt: maxExclusive must be a positive integer, got ${maxExclusive}`)
  }
  if (maxExclusive > UINT32_MAX) {
    throw new Error(`rngNextInt: maxExclusive too large: ${maxExclusive}`)
  }

  const limit = UINT32_MAX + 1 - ((UINT32_MAX + 1) % maxExclusive)

  let current = state
  let value = 0
  for (;;) {
    const next = rngNext(current)
    current = next.nextState
    if (next.value < limit) {
      value = next.value % maxExclusive
      break
    }
  }

  return { value, nextState: current }
}
