/**
 * xoshiro128** PRNG state and result types (ADR-002).
 *
 * The four words are uint32. The all-zero state is forbidden: the shift/xor
 * transition would keep every word zero forever (an absorbing state). The
 * seed derivation in `create-rng.ts` guarantees the state is never all-zero.
 */
export interface RngState {
  readonly s0: number
  readonly s1: number
  readonly s2: number
  readonly s3: number
}

export interface RngResult {
  readonly value: number
  readonly nextState: RngState
}

/** Result of a bounded integer draw (same shape as {@link RngResult}). */
export type RngIntResult = RngResult

export { UINT32_MAX } from '../primitives/parse.js'
