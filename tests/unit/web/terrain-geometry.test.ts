import { describe, expect, it } from 'vitest'
import { cellFromLocal } from '../../../apps/web/src/features/laboratory/editor/terrain-geometry.js'

describe('cellFromLocal', () => {
  it('maps a local pixel inside a cell to its coordinates', () => {
    expect(cellFromLocal(0, 0, 32, 64)).toEqual({ x: 0, y: 0 })
    expect(cellFromLocal(63, 63, 32, 64)).toEqual({ x: 0, y: 0 })
    expect(cellFromLocal(64, 0, 32, 64)).toEqual({ x: 1, y: 0 })
    expect(cellFromLocal(130, 200, 32, 64)).toEqual({ x: 2, y: 3 })
  })

  it('returns null outside the grid', () => {
    expect(cellFromLocal(-1, 0, 32, 64)).toBeNull()
    expect(cellFromLocal(0, -1, 32, 64)).toBeNull()
    expect(cellFromLocal(32 * 64, 0, 32, 64)).toBeNull()
    expect(cellFromLocal(0, 32 * 64, 32, 64)).toBeNull()
  })

  it('accepts the last valid pixel of the grid', () => {
    expect(cellFromLocal(32 * 64 - 1, 32 * 64 - 1, 32, 64)).toEqual({ x: 31, y: 31 })
  })
})
