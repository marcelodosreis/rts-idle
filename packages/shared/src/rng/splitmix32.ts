/**
 * SplitMix32 seed sequence generator.
 *
 * Derives the four initial uint32 words of a xoshiro128** state from a single
 * integer seed (ADR-002). Each call advances the internal counter and mixes it
 * into a pseudo-random uint32. The increment constant is the fractional part
 * of the golden ratio, the standard SplitMix32 choice.
 */
export function splitmix32(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state + 0x9e3779b9) | 0
    let mixed = state ^ (state >>> 16)
    mixed = Math.imul(mixed, 0x21f0aaad)
    mixed = mixed ^ (mixed >>> 15)
    mixed = Math.imul(mixed, 0x735a2d97)
    mixed = mixed ^ (mixed >>> 15)
    return mixed >>> 0
  }
}
