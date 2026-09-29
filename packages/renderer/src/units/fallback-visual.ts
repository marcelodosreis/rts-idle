import { fixedToRenderPixels, UNIT_GEOMETRY, type UnitKind } from '@rts/shared'
import { Graphics, Text } from 'pixi.js'
import { ownerColor } from '../world/owner-color.js'
import { FALLBACK_GLYPH } from './fallback.js'

const UNIT_RADIUS = fixedToRenderPixels(UNIT_GEOMETRY.pawn.cellSize / 2)

export function createFallbackVisual(kind: UnitKind, owner: number): { readonly body: Graphics; readonly label: Text } {
  const fallback = new Graphics()
  const fallbackColor = ownerColor(owner, 0x000000)
  const glyph = FALLBACK_GLYPH[kind]
  switch (glyph.shape) {
    case 'circle':
      fallback.circle(0, 0, UNIT_RADIUS).fill(fallbackColor)
      fallback.circle(0, 0, UNIT_RADIUS).stroke({ color: 0x000000, width: 3, alpha: 0.3 })
      break
    case 'square':
      fallback.roundRect(-UNIT_RADIUS, -UNIT_RADIUS, UNIT_RADIUS * 2, UNIT_RADIUS * 2, 6).fill(fallbackColor)
      fallback.roundRect(-UNIT_RADIUS, -UNIT_RADIUS, UNIT_RADIUS * 2, UNIT_RADIUS * 2, 6).stroke({
        color: 0x000000,
        width: 3,
        alpha: 0.3
      })
      break
    case 'triangle':
      fallback
        .moveTo(0, -UNIT_RADIUS)
        .lineTo(-UNIT_RADIUS, UNIT_RADIUS)
        .lineTo(UNIT_RADIUS, UNIT_RADIUS)
        .closePath()
        .fill(fallbackColor)
      fallback
        .moveTo(0, -UNIT_RADIUS)
        .lineTo(-UNIT_RADIUS, UNIT_RADIUS)
        .lineTo(UNIT_RADIUS, UNIT_RADIUS)
        .closePath()
        .stroke({ color: 0x000000, width: 3, alpha: 0.3 })
      break
  }
  const label = new Text({
    text: glyph.letter,
    style: { fontSize: 22, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 3 } }
  })
  label.anchor.set(0.5, 0.5)
  label.eventMode = 'none'
  label.resolution = 2
  return { body: fallback, label }
}
