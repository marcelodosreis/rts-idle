import { describe, expect, it } from 'vitest'
import { HP_BAR_WIDTH, hpColor, hpFillWidth, hpRatio } from '../../packages/renderer/src/hp-bar.js'

describe('health bar presentation helpers', () => {
  it('clamps the ratio to 0..1', () => {
    expect(hpRatio(50, 100)).toBe(0.5)
    expect(hpRatio(120, 100)).toBe(1)
    expect(hpRatio(-5, 100)).toBe(0)
  })

  it('colors by remaining ratio (green → yellow → red)', () => {
    expect(hpColor(1)).toBe(0x4caf50)
    expect(hpColor(0.6)).toBe(0x4caf50)
    expect(hpColor(0.5)).toBe(0xffc107)
    expect(hpColor(0.3)).toBe(0xffc107)
    expect(hpColor(0.25)).toBe(0xf44336)
    expect(hpColor(0)).toBe(0xf44336)
  })

  it('fills the bar proportionally', () => {
    expect(hpFillWidth(0.5, HP_BAR_WIDTH)).toBe(18)
    expect(hpFillWidth(0, HP_BAR_WIDTH)).toBe(0)
    expect(hpFillWidth(1, HP_BAR_WIDTH)).toBe(HP_BAR_WIDTH)
  })
})
