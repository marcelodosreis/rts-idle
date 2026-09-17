import type { RngResult, RngState } from './rng-state.js'
import { rotateLeft } from './rotate-left.js'

/**
 * Advances a xoshiro128** state one step and returns the next uint32 value.
 *
 * The four state words are transitioned with shifts and xors, and the output
 * `value` is the finalization mix of `s1` (xoshiro128** star-star). All words
 * influence the transition so the state cannot get stuck in a low-dimensional
 * cycle.
 */
export function rngNext(state: RngState): RngResult {
  const s0 = state.s0 >>> 0
  const s1 = state.s1 >>> 0
  const s2 = state.s2 >>> 0
  const s3 = state.s3 >>> 0

  const value = (rotateLeft(Math.imul(s1, 5), 7) * 9) >>> 0
  const leftShiftedS1 = (s1 << 9) >>> 0
  const mixedS2 = (s2 ^ s0) >>> 0
  const mixedS3 = (s3 ^ s1) >>> 0
  const nextS1 = (s1 ^ mixedS2) >>> 0
  const nextS0 = (s0 ^ mixedS3) >>> 0
  const nextS2 = (mixedS2 ^ leftShiftedS1) >>> 0
  const nextS3 = rotateLeft(mixedS3, 11)

  return { value, nextState: { s0: nextS0, s1: nextS1, s2: nextS2, s3: nextS3 } }
}
