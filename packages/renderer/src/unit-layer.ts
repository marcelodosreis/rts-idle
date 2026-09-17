import { fixedToRenderPixels } from '@rts/shared'
import { Graphics } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import { interpolationAlpha, lerpPoint, type Point } from './interpolation.js'
import type { RenderUnit } from './types.js'

const OWNER_COLORS = [0x2e7d32, 0xc62828, 0x1565c0, 0xf9a825]

/** Visual radius of a unit placeholder in render pixels (1 tile = 64 px). */
export const UNIT_RADIUS = 20

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

  position(): { readonly x: number; readonly y: number } {
    return { x: this.graphics.position.x, y: this.graphics.position.y }
  }
}

/**
 * Owns the unit sprites and interpolates their positions between the two most
 * recent frames. `present` diffs membership (add/update/remove) and records
 * the frame's target positions in render pixels plus the authoritative fixed
 * coordinates; `interpolate` (called by the renderer's visual loop) eases each
 * sprite from the previous target to the current one, removing the teleport.
 */
export class UnitLayer {
  private readonly units = new Map<number, UnitSprite>()
  private readonly viewport: Viewport
  private readonly onUnitSelected: (id: number) => void
  private previous: ReadonlyMap<number, Point> | null = null
  private current: ReadonlyMap<number, Point> | null = null
  private currentTime = 0
  private previousTime = 0
  private readonly currentFixed = new Map<number, Point>()

  constructor(viewport: Viewport, onUnitSelected: (id: number) => void) {
    this.viewport = viewport
    this.onUnitSelected = onUnitSelected
  }

  /** Diffs the given units against the current sprites and records the frame. */
  present(units: readonly RenderUnit[], now: number): void {
    const seen = new Set<number>()
    const next = new Map<number, Point>()
    const nextFixed = new Map<number, Point>()
    for (const unit of units) {
      seen.add(unit.id)
      const position = { x: fixedToRenderPixels(unit.x), y: fixedToRenderPixels(unit.y) }
      next.set(unit.id, position)
      nextFixed.set(unit.id, { x: unit.x, y: unit.y })
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
    }
    for (const [id, sprite] of [...this.units]) {
      if (!seen.has(id)) {
        this.viewport.removeChild(sprite.graphics)
        sprite.graphics.destroy()
        this.units.delete(id)
      }
    }

    this.previous = this.current
    this.previousTime = this.currentTime
    this.current = next
    this.currentTime = now
    this.currentFixed.clear()
    for (const [id, point] of nextFixed) {
      this.currentFixed.set(id, point)
    }
    // Snap brand-new units to their target so they do not fly across the map.
    if (this.previous === null) {
      for (const [id, sprite] of this.units) {
        const target = this.current.get(id)
        if (target !== undefined) {
          sprite.setPosition(target.x, target.y)
        }
      }
    }
  }

  /** Eases sprite positions toward the current frame's targets. */
  interpolate(now: number): void {
    if (this.current === null || this.previous === null) {
      return
    }
    const alpha = interpolationAlpha(now, this.currentTime, this.previousTime)
    for (const [id, sprite] of this.units) {
      const target = this.current.get(id)
      if (target === undefined) {
        continue
      }
      const from = this.previous.get(id)
      if (from === undefined) {
        sprite.setPosition(target.x, target.y)
        continue
      }
      const eased = lerpPoint(from, target, alpha)
      sprite.setPosition(eased.x, eased.y)
    }
  }

  has(id: number): boolean {
    return this.units.has(id)
  }

  /** Current interpolated sprite position in world space (render pixels). */
  position(id: number): { readonly x: number; readonly y: number } | undefined {
    const sprite = this.units.get(id)
    if (sprite === undefined) {
      return undefined
    }
    return sprite.position()
  }

  /** All current sprite positions in render pixels (for selection queries). */
  positionsPixels(): ReadonlyMap<number, { readonly x: number; readonly y: number }> {
    const out = new Map<number, { readonly x: number; readonly y: number }>()
    for (const [id, sprite] of this.units) {
      out.set(id, sprite.position())
    }
    return out
  }

  /** Authoritative fixed-unit positions of the latest frame (for debug/e2e). */
  fixedPositions(): ReadonlyMap<number, { readonly x: number; readonly y: number }> {
    const out = new Map<number, { readonly x: number; readonly y: number }>()
    for (const [id, point] of this.currentFixed) {
      out.set(id, { x: point.x, y: point.y })
    }
    return out
  }
}
