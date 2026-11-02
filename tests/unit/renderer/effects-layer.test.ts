import { EffectsLayer } from '@rts/renderer'
import { Container } from 'pixi.js'
import { describe, expect, it } from 'vitest'

describe('EffectsLayer', () => {
  it('retains instant attack feedback for non-projectile attacks', () => {
    const layer = new Container()
    const effects = new EffectsLayer(layer)
    effects.trackPosition(1, 0, 0)
    effects.trackPosition(2, 256, 0)

    effects.handleEvents([{ type: 'attackFired', attackerId: 1, targetId: 2 }], 0)

    expect(layer.children).toHaveLength(1)
  })

  it('does not duplicate a projectile launch with an instant streak', () => {
    const layer = new Container()
    const effects = new EffectsLayer(layer)
    effects.trackPosition(1, 0, 0)
    effects.trackPosition(2, 256, 0)

    effects.handleEvents(
      [
        { type: 'attackFired', attackerId: 1, targetId: 2 },
        { type: 'projectileLaunched', projectileId: 1, kind: 'arrow', owner: 0, x: 0, y: 0 }
      ],
      0
    )

    expect(layer.children).toHaveLength(0)
  })

  it('presents and expires impact and expiry feedback at event positions', () => {
    const layer = new Container()
    const effects = new EffectsLayer(layer)

    effects.handleEvents(
      [
        { type: 'projectileImpacted', projectileId: 1, kind: 'arrow', x: 256, y: 512 },
        { type: 'projectileExpired', projectileId: 2, kind: 'arrow', x: 768, y: 1024, reason: 'TTL' }
      ],
      100
    )

    expect(effects.projectileFeedback()).toEqual([
      { type: 'impact', x: 64, y: 128 },
      { type: 'expiry', x: 192, y: 256 }
    ])
    effects.tick(551)
    expect(effects.projectileFeedback()).toEqual([])
  })

  it('presents and expires area impact feedback at the event position', () => {
    const layer = new Container()
    const effects = new EffectsLayer(layer)

    effects.handleEvents(
      [
        {
          type: 'areaDamageImpacted',
          projectileId: 3,
          kind: 'arrow',
          x: 512,
          y: 768,
          innerRadius: 128,
          totalRadius: 384
        }
      ],
      0
    )

    expect(effects.projectileFeedback()).toEqual([{ type: 'area', x: 128, y: 192 }])
    effects.tick(500)
    expect(effects.projectileFeedback()).toEqual([])
  })
})
