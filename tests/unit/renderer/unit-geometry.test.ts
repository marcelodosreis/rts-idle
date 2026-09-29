import { fixedToRenderPixels, UNIT_GEOMETRY } from '@rts/shared'
import { describe, expect, it } from 'vitest'
import {
  CLICK_RADIUS,
  normalizedUnitScale,
  TARGET_RADIUS,
  UNIT_RADIUS
} from '../../../packages/renderer/src/units/sprite.js'

describe('normalized unit geometry', () => {
  it.each(['pawn', 'warrior', 'archer'] as const)('%s reaches the shared 0.75-tile visual height', (kind) => {
    const geometry = UNIT_GEOMETRY[kind]
    const sourceHeight = fixedToRenderPixels(geometry.sourceVisibleHeight)
    const targetHeight = fixedToRenderPixels(geometry.targetVisibleHeight)
    expect(normalizedUnitScale(kind) * sourceHeight).toBe(targetHeight)
    expect(targetHeight).toBe(48)
    expect(fixedToRenderPixels(geometry.cellSize)).toBe(64)
  })

  it('derives the renderer hit areas from the shared unit geometry', () => {
    expect(UNIT_RADIUS).toBe(32)
    expect(CLICK_RADIUS).toBe(24)
    expect(TARGET_RADIUS).toBe(32)
  })
})
