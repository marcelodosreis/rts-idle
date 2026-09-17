import { Graphics } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import type { RenderUnit } from './types.js'

const OWNER_COLORS = [0x2e7d32, 0xc62828, 0x1565c0, 0xf9a825]

/** Visual radius of a unit sprite; shared with the selection ring sizing. */
export const UNIT_RADIUS = 8

class UnitSprite {
  readonly graphics: Graphics

  constructor(id: number, owner: number) {
    this.graphics = new Graphics()
    this.graphics.circle(0, 0, UNIT_RADIUS).fill(OWNER_COLORS[owner % OWNER_COLORS.length] ?? 0x000000)
    this.graphics.eventMode = 'static'
    this.graphics.cursor = 'pointer'
    this.graphics.label = `unit-${id}`
  }

  setPosition(x: number, y: number): void {
    this.graphics.position.set(x, y)
  }
}

/**
 * Owns the unit sprites: creates, positions, and removes them to mirror a
 * frame, and reports unit positions for selection queries. Sprites live in the
 * viewport's world space.
 */
export class UnitLayer {
  private readonly units = new Map<number, UnitSprite>()
  private readonly viewport: Viewport
  private readonly onUnitSelected: (id: number) => void

  constructor(viewport: Viewport, onUnitSelected: (id: number) => void) {
    this.viewport = viewport
    this.onUnitSelected = onUnitSelected
  }

  /** Diffs the given units against the current sprites: add/update/remove. */
  present(units: readonly RenderUnit[]): void {
    const seen = new Set<number>()
    for (const unit of units) {
      seen.add(unit.id)
      let sprite = this.units.get(unit.id)
      if (sprite === undefined) {
        sprite = new UnitSprite(unit.id, unit.owner)
        sprite.graphics.on('pointerdown', (event) => {
          event.stopPropagation()
          this.onUnitSelected(unit.id)
        })
        this.viewport.addChild(sprite.graphics)
        this.units.set(unit.id, sprite)
      }
      sprite.setPosition(unit.x, unit.y)
    }
    for (const [id, sprite] of [...this.units]) {
      if (!seen.has(id)) {
        this.viewport.removeChild(sprite.graphics)
        sprite.graphics.destroy()
        this.units.delete(id)
      }
    }
  }

  has(id: number): boolean {
    return this.units.has(id)
  }

  /** Current position of a unit in world space, if the sprite exists. */
  position(id: number): { readonly x: number; readonly y: number } | undefined {
    const sprite = this.units.get(id)
    if (sprite === undefined) {
      return undefined
    }
    return { x: sprite.graphics.position.x, y: sprite.graphics.position.y }
  }

  /** Copy of all current unit positions in world space. */
  positions(): ReadonlyMap<number, { readonly x: number; readonly y: number }> {
    const out = new Map<number, { readonly x: number; readonly y: number }>()
    for (const [id, sprite] of this.units) {
      out.set(id, { x: sprite.graphics.position.x, y: sprite.graphics.position.y })
    }
    return out
  }
}
