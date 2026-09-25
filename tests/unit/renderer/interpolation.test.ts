import { interpolationAlpha, lerpPoint } from '@rts/renderer'
import { describe, expect, it } from 'vitest'

describe('interpolationAlpha', () => {
  it('returns 0 at the moment the current frame is received', () => {
    expect(interpolationAlpha(1000, 1000, 950)).toBe(0)
  })

  it('returns 1 after one frame interval', () => {
    expect(interpolationAlpha(1000, 950, 900)).toBe(1)
  })

  it('clamps between 0 and 1 and never extrapolates', () => {
    expect(interpolationAlpha(1200, 1000, 900)).toBe(1)
    expect(interpolationAlpha(1000, 1000, 900)).toBe(0)
    expect(interpolationAlpha(1000, 1000, 1000)).toBe(1)
  })

  it('produces intermediate values within the window', () => {
    expect(interpolationAlpha(1050, 1000, 900)).toBe(0.5)
  })
})

describe('lerpPoint', () => {
  it('linearly interpolates between two points', () => {
    expect(lerpPoint({ x: 0, y: 0 }, { x: 100, y: 40 }, 0.5)).toEqual({ x: 50, y: 20 })
    expect(lerpPoint({ x: 0, y: 0 }, { x: 100, y: 40 }, 0)).toEqual({ x: 0, y: 0 })
    expect(lerpPoint({ x: 0, y: 0 }, { x: 100, y: 40 }, 1)).toEqual({ x: 100, y: 40 })
  })
})
