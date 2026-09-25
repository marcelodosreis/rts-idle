import { describe, expect, it } from 'vitest'
import {
  BAR_BACKGROUND,
  BAR_BORDER,
  BAR_HEIGHT,
  BAR_RADIUS,
  BAR_WIDTH,
  barFillWidth,
  clampRatio,
  drawProgressBar,
  hpColor
} from '../../../packages/renderer/src/effects/progress-bar.js'

interface Call {
  readonly method: string
  readonly args: readonly unknown[]
}

function fakeGraphics(): { readonly g: ReturnType<typeof createGraphics>; readonly calls: Call[] } {
  const calls: Call[] = []
  const g = {
    roundRect: (...args: unknown[]) => {
      calls.push({ method: 'roundRect', args })
      return g
    },
    fill: (...args: unknown[]) => {
      calls.push({ method: 'fill', args })
      return g
    },
    stroke: (...args: unknown[]) => {
      calls.push({ method: 'stroke', args })
      return g
    }
  }
  return { g: g as unknown as ReturnType<typeof createGraphics>, calls }
}

function createGraphics() {
  return {} as import('pixi.js').Graphics
}

describe('clampRatio', () => {
  it('clamps the ratio to 0..1', () => {
    expect(clampRatio(50, 100)).toBe(0.5)
    expect(clampRatio(120, 100)).toBe(1)
    expect(clampRatio(-5, 100)).toBe(0)
  })

  it('returns 0 when max <= 0', () => {
    expect(clampRatio(0, 0)).toBe(0)
    expect(clampRatio(5, -1)).toBe(0)
  })
})

describe('barFillWidth', () => {
  it('fills the bar proportionally', () => {
    expect(barFillWidth(0.5, BAR_WIDTH)).toBe(22)
    expect(barFillWidth(0, BAR_WIDTH)).toBe(0)
    expect(barFillWidth(1, BAR_WIDTH)).toBe(BAR_WIDTH)
  })
})

describe('hpColor', () => {
  it('colors by remaining ratio (green -> yellow -> red)', () => {
    expect(hpColor(1)).toBe(0x22c55e)
    expect(hpColor(0.6)).toBe(0x22c55e)
    expect(hpColor(0.5)).toBe(0xffc107)
    expect(hpColor(0.3)).toBe(0xffc107)
    expect(hpColor(0.25)).toBe(0xf44336)
    expect(hpColor(0)).toBe(0xf44336)
  })
})

describe('drawProgressBar', () => {
  it('draws background, fill, and border when all provided', () => {
    const { g, calls } = fakeGraphics()
    drawProgressBar(g, {
      x: -22,
      y: -34,
      width: BAR_WIDTH,
      height: BAR_HEIGHT,
      ratio: 0.5,
      fillColor: 0x22c55e,
      background: BAR_BACKGROUND,
      border: BAR_BORDER,
      radius: BAR_RADIUS
    })
    expect(calls).toEqual([
      { method: 'roundRect', args: [-22, -34, BAR_WIDTH, BAR_HEIGHT, 2] },
      { method: 'fill', args: [{ color: 0x111827, alpha: 0.8 }] },
      { method: 'roundRect', args: [-22, -34, 22, BAR_HEIGHT, 2] },
      { method: 'fill', args: [{ color: 0x22c55e }] },
      { method: 'roundRect', args: [-22, -34, BAR_WIDTH, BAR_HEIGHT, 2] },
      { method: 'stroke', args: [{ color: 0x0f172a, width: 2 }] }
    ])
  })

  it('skips background when null', () => {
    const { g, calls } = fakeGraphics()
    drawProgressBar(g, {
      x: 0,
      y: 0,
      width: 100,
      height: 6,
      ratio: 0.3,
      fillColor: 0x22c55e,
      background: null,
      border: null,
      radius: 2
    })
    expect(calls).toEqual([
      { method: 'roundRect', args: [0, 0, 30, 6, 2] },
      { method: 'fill', args: [{ color: 0x22c55e }] }
    ])
  })

  it('skips fill when ratio is 0', () => {
    const { g, calls } = fakeGraphics()
    drawProgressBar(g, {
      x: 0,
      y: 0,
      width: 100,
      height: 6,
      ratio: 0,
      fillColor: 0x22c55e,
      background: BAR_BACKGROUND,
      border: BAR_BORDER,
      radius: 2
    })
    expect(calls).toEqual([
      { method: 'roundRect', args: [0, 0, 100, 6, 2] },
      { method: 'fill', args: [{ color: 0x111827, alpha: 0.8 }] },
      { method: 'roundRect', args: [0, 0, 100, 6, 2] },
      { method: 'stroke', args: [{ color: 0x0f172a, width: 2 }] }
    ])
  })

  it('clamps radius for narrow fills', () => {
    const { g, calls } = fakeGraphics()
    drawProgressBar(g, {
      x: 0,
      y: 0,
      width: 100,
      height: 6,
      ratio: 0.01,
      fillColor: 0x22c55e,
      background: null,
      border: null,
      radius: 2
    })
    const fillRadius = calls[0]!.args[4] as number
    expect(fillRadius).toBeLessThanOrEqual(0.5)
  })
})
