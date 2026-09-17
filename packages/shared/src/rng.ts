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

export interface RngIntResult {
  readonly value: number
  readonly nextState: RngState
}

export const UINT32_MAX = 0xffffffff

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0
}

function splitmix32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x9e3779b9) | 0
    let t = a ^ (a >>> 16)
    t = Math.imul(t, 0x21f0aaad)
    t = t ^ (t >>> 15)
    t = Math.imul(t, 0x735a2d97)
    t = t ^ (t >>> 15)
    return t >>> 0
  }
}

export function createRng(seed: number): RngState {
  const g = splitmix32(seed)
  let s0 = g()
  const s1 = g()
  const s2 = g()
  const s3 = g()
  if ((s0 | s1 | s2 | s3) === 0) {
    s0 = 0x9e3779b9
  }
  return { s0, s1, s2, s3 }
}

export function rngNext(state: RngState): RngResult {
  const s0 = state.s0 >>> 0
  const s1 = state.s1 >>> 0
  const s2 = state.s2 >>> 0
  const s3 = state.s3 >>> 0

  const value = (rotl(Math.imul(s1, 5), 7) * 9) >>> 0
  const t = (s1 << 9) >>> 0
  const ns2 = (s2 ^ s0) >>> 0
  const ns3 = (s3 ^ s1) >>> 0
  const ns1 = (s1 ^ ns2) >>> 0
  const ns0 = (s0 ^ ns3) >>> 0
  const nn2 = (ns2 ^ t) >>> 0
  const nn3 = rotl(ns3, 11)

  return { value, nextState: { s0: ns0, s1: ns1, s2: nn2, s3: nn3 } }
}

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
