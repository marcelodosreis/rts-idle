import { describe, expect, it } from 'vitest'
import { UnitSprite } from '../../../packages/renderer/src/units/sprite.js'

if (typeof navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: '' } })
}

function healthBar(sprite: UnitSprite): { readonly visible: boolean } {
  const bar = sprite.container.children[2]
  if (bar === undefined) {
    throw new Error('UnitSprite health bar is missing')
  }
  return bar
}

describe('UnitSprite health bar', () => {
  it('shows full health instead of hiding the bar', () => {
    const sprite = new UnitSprite('pawn', 0, null)

    sprite.setHealth(100, 100)

    expect(healthBar(sprite).visible).toBe(true)
    expect(sprite.health()).toEqual({ current: 100, max: 100 })
  })

  it('hides the bar when health is unavailable', () => {
    const sprite = new UnitSprite('pawn', 0, null)
    sprite.setHealth(80, 100)

    sprite.setHealth(undefined, undefined)

    expect(healthBar(sprite).visible).toBe(false)
    expect(sprite.health()).toBeNull()
  })
})
