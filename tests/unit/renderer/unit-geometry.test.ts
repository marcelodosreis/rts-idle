import { fixedToRenderPixels, UNIT_GEOMETRY } from '@rts/shared'
import { describe, expect, it } from 'vitest'
import { lancerDirectionForDelta } from '../../../packages/renderer/src/units/lancer-animation.js'
import {
  CLICK_RADIUS,
  frameKey,
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

  it('resolves the authored Lancer and Monk sprite keys', () => {
    expect(frameKey(0, 'lancer', 'idle')).toBe('units.blue.lancer.idle')
    expect(frameKey(0, 'lancer', 'run')).toBe('units.blue.lancer.run')
    expect(frameKey(0, 'lancer', 'attack')).toBe('units.blue.lancer.downright_attack')
    expect(frameKey(0, 'monk', 'idle')).toBe('units.blue.monk.idle')
    expect(frameKey(0, 'monk', 'run')).toBe('units.blue.monk.run')
    expect(frameKey(0, 'monk', 'attack')).toBe('units.blue.monk.heal')
  })

  it('selects the authored Lancer attack direction from the target vector', () => {
    expect(lancerDirectionForDelta(0, -10)).toBe('up')
    expect(lancerDirectionForDelta(10, -10)).toBe('upright')
    expect(lancerDirectionForDelta(10, 0)).toBe('right')
    expect(lancerDirectionForDelta(10, 10)).toBe('downright')
    expect(lancerDirectionForDelta(0, 10)).toBe('down')
  })
})
