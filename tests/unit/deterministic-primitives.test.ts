import {
  allocateEntityId,
  createRng,
  distSquaredFixed,
  FIXED_SCALE,
  fixedToTiles,
  intSqrt,
  MAX_ENTITY_ID,
  PLAYER_IDS,
  peekEntityId,
  rngNext,
  rngNextInt,
  START_ENTITY_ID,
  tilesToFixed
} from '@rts/shared'
import { describe, expect, it } from 'vitest'
import { SEEDS } from '../fixtures/index.js'

describe('fixed point arithmetic', () => {
  it('converts authorial tile values to integer fixed units', () => {
    expect(tilesToFixed(1)).toBe(FIXED_SCALE)
    expect(tilesToFixed(0.25)).toBe(64)
    expect(tilesToFixed(2.25)).toBe(576)
    expect(tilesToFixed(0)).toBe(0)
  })

  it('round-trips fixed units back to tiles', () => {
    expect(fixedToTiles(576)).toBe(2.25)
    expect(fixedToTiles(FIXED_SCALE)).toBe(1)
  })

  it('rejects values not representable in fixed scale', () => {
    expect(() => tilesToFixed(0.1)).toThrow()
    expect(() => tilesToFixed(Number.NaN)).toThrow()
    expect(() => tilesToFixed(Number.POSITIVE_INFINITY)).toThrow()
  })

  it('computes squared distance in fixed units', () => {
    expect(distSquaredFixed(0, 0, FIXED_SCALE, 0)).toBe(FIXED_SCALE * FIXED_SCALE)
    expect(distSquaredFixed(0, 0, FIXED_SCALE, FIXED_SCALE)).toBe(2 * FIXED_SCALE * FIXED_SCALE)
  })

  it('computes integer square roots without floating error', () => {
    expect(intSqrt(0)).toBe(0)
    expect(intSqrt(1)).toBe(1)
    expect(intSqrt(2)).toBe(1)
    expect(intSqrt(4)).toBe(2)
    expect(intSqrt(15)).toBe(3)
    expect(intSqrt(16)).toBe(4)
    expect(intSqrt(999_999_999_999)).toBe(999_999)
    expect(() => intSqrt(-1)).toThrow()
    expect(() => intSqrt(1.5)).toThrow()
  })
})

describe('player slots', () => {
  it('exposes the exact immutable competitive slots', () => {
    expect(PLAYER_IDS).toEqual([0, 1, 2, 3])
    expect(Object.isFrozen(PLAYER_IDS)).toBe(true)
  })
})

describe('deterministic RNG (xoshiro128**)', () => {
  it('produces a pinned golden sequence for seed 1', () => {
    let state = createRng(SEEDS.unit.rngGolden)
    const values: number[] = []
    for (let i = 0; i < 6; i += 1) {
      const next = rngNext(state)
      values.push(next.value)
      state = next.nextState
    }
    expect(values).toEqual([393288148, 2174103013, 3814759091, 2092745082, 1865176206, 2179171167])
  })

  it('is deterministic: same seed yields identical sequence', () => {
    const run = (seed: number): number[] => {
      let state = createRng(seed)
      const out: number[] = []
      for (let i = 0; i < 100; i += 1) {
        const next = rngNext(state)
        out.push(next.value)
        state = next.nextState
      }
      return out
    }
    expect(run(SEEDS.unit.rngSameSeed)).toEqual(run(SEEDS.unit.rngSameSeed))
  })

  it('diverges for different seeds', () => {
    expect(createRng(SEEDS.unit.rngDivergenceA)).not.toEqual(createRng(SEEDS.unit.rngDivergenceB))
  })

  it('emits uint32 values', () => {
    let state = createRng(SEEDS.unit.rngUint32)
    for (let i = 0; i < 1000; i += 1) {
      const next = rngNext(state)
      expect(next.value).toBeGreaterThanOrEqual(0)
      expect(next.value).toBeLessThanOrEqual(0xffffffff)
      state = next.nextState
    }
  })

  it('resumes identically from an exported state', () => {
    let original = createRng(SEEDS.unit.rngExportRestore)
    for (let i = 0; i < 10; i += 1) {
      const next = rngNext(original)
      original = next.nextState
    }

    const reference: number[] = []
    for (let i = 0; i < 20; i += 1) {
      const next = rngNext(original)
      reference.push(next.value)
      original = next.nextState
    }

    const fromExport: number[] = []
    let exported = createRng(SEEDS.unit.rngExportRestore)
    for (let i = 0; i < 10; i += 1) {
      const next = rngNext(exported)
      exported = next.nextState
    }
    const restored = exported
    let cursor = restored
    for (let i = 0; i < 20; i += 1) {
      const next = rngNext(cursor)
      fromExport.push(next.value)
      cursor = next.nextState
    }

    expect(fromExport).toEqual(reference)
  })

  it('never produces the forbidden all-zero state', () => {
    let state = createRng(SEEDS.unit.rngZeroGuard)
    for (let i = 0; i < 1000; i += 1) {
      expect(state.s0).not.toBe(0)
      const next = rngNext(state)
      state = next.nextState
    }
  })

  it('nextInt respects bounds deterministically', () => {
    const results: number[] = []
    let state = createRng(SEEDS.unit.rngNextInt)
    for (let i = 0; i < 100; i += 1) {
      const next = rngNextInt(state, 10)
      expect(next.value).toBeGreaterThanOrEqual(0)
      expect(next.value).toBeLessThan(10)
      results.push(next.value)
      state = next.nextState
    }
    const again: number[] = []
    state = createRng(SEEDS.unit.rngNextInt)
    for (let i = 0; i < 100; i += 1) {
      const next = rngNextInt(state, 10)
      again.push(next.value)
      state = next.nextState
    }
    expect(results).toEqual(again)
  })

  it('rejects invalid nextInt bounds', () => {
    expect(() => rngNextInt(createRng(SEEDS.unit.rngInvalidBounds), 0)).toThrow()
    expect(() => rngNextInt(createRng(SEEDS.unit.rngInvalidBounds), -1)).toThrow()
    expect(() => rngNextInt(createRng(SEEDS.unit.rngInvalidBounds), 1.5)).toThrow()
  })
})

describe('entity id allocation', () => {
  it('starts at START_ENTITY_ID and increments monotonically', () => {
    let nextEntityId = START_ENTITY_ID
    const ids: number[] = []
    for (let i = 0; i < 10; i += 1) {
      const allocated = allocateEntityId(nextEntityId)
      ids.push(allocated.id)
      nextEntityId = allocated.nextEntityId
    }
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('does not recycle ids', () => {
    let nextEntityId = START_ENTITY_ID
    const first = allocateEntityId(nextEntityId)
    nextEntityId = first.nextEntityId
    const second = allocateEntityId(nextEntityId)
    expect(second.id).toBeGreaterThan(first.id)
  })

  it('peeks without advancing', () => {
    expect(peekEntityId(START_ENTITY_ID)).toBe(START_ENTITY_ID)
    expect(peekEntityId(START_ENTITY_ID)).toBe(START_ENTITY_ID)
  })

  it('throws on overflow', () => {
    expect(() => peekEntityId(MAX_ENTITY_ID + 1)).toThrow()
    expect(() => allocateEntityId(MAX_ENTITY_ID + 1)).toThrow()
    expect(() => peekEntityId(1.5)).toThrow()
  })
})
