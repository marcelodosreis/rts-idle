import { fixedToRenderPixels } from '@rts/shared'
import { type AnimatedSprite, Circle, Container, Graphics, Sprite } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import type { AssetLibrary } from './assets/asset-library.js'
import { interpolationAlpha, lerpPoint } from './interpolation.js'
import type { RenderUnit, UnitKind } from './types.js'

const OWNER_COLORS = [0x2e7d32, 0xc62828, 0x1565c0, 0xf9a825]

/** Visual radius of a unit placeholder in render pixels (1 tile = 64 px). */
export const UNIT_RADIUS = 20
/** Sprite scale: 192 px unit cells render about 0.8 tile tall. */
const SPRITE_SCALE = 0.5
/** Vertical offset of the shadow decal below the unit's feet. */
const SHADOW_OFFSET = 6

const FACTION_BY_OWNER: readonly ('blue' | 'red' | 'purple' | 'yellow')[] = ['blue', 'red', 'purple', 'yellow']

interface UnitFrames {
  readonly idle: AnimatedSprite
  readonly run: AnimatedSprite
}

function frameKey(owner: number, kind: UnitKind, anim: 'idle' | 'run'): string {
  const faction = FACTION_BY_OWNER[owner % FACTION_BY_OWNER.length] ?? 'blue'
  return `units.${faction}.${kind}.${anim}`
}

class UnitSprite {
  readonly container: Container
  readonly kind: UnitKind
  readonly ownerFaction: number
  private body: AnimatedSprite | Graphics
  private readonly fallback: Graphics
  private frames: UnitFrames | null

  constructor(kind: UnitKind, owner: number, frames: UnitFrames | null) {
    this.kind = kind
    this.ownerFaction = owner % FACTION_BY_OWNER.length
    this.container = new Container()
    this.container.eventMode = 'static'
    this.container.cursor = 'pointer'
    // Circular hit area centered just above the feet: covers the feet and the
    // lower body, but keeps a drag starting ~25 px from a unit on empty ground
    // (box selection) and never reaches a neighbor 64 px away.
    this.container.hitArea = new Circle(0, -12, 26)
    this.frames = frames
    this.fallback = new Graphics()
    this.fallback.circle(0, 0, UNIT_RADIUS).fill(OWNER_COLORS[owner % OWNER_COLORS.length] ?? 0x000000)
    this.body = this.fallback
    this.container.addChild(this.fallback)
    if (frames !== null) {
      this.body = frames.idle
      this.body.visible = false
      this.container.addChild(this.body)
    }
  }

  attachShadow(texture: Sprite): void {
    texture.anchor.set(0.5, 0.5)
    texture.y = SHADOW_OFFSET
    this.container.addChildAt(texture, 0)
  }

  /** Upgrades a placeholder sprite to animated frames once art loads. */
  swapFrames(frames: UnitFrames): void {
    if (this.frames !== null) {
      return
    }
    this.frames = frames
    this.frames.idle.visible = false
    this.frames.run.visible = false
    this.container.removeChild(this.fallback)
    this.fallback.destroy()
    this.container.addChild(this.frames.idle)
    this.body = this.frames.idle
  }

  /** Shows the run animation when moving and flips by horizontal direction. */
  setState(moving: boolean, facingLeft: boolean): void {
    if (this.frames === null) {
      return
    }
    const next = moving ? this.frames.run : this.frames.idle
    if (this.body !== next) {
      this.body.visible = false
      next.visible = true
      this.body = next
    }
    const direction = facingLeft ? -1 : 1
    this.body.scale.set(SPRITE_SCALE * direction, SPRITE_SCALE)
  }

  setPosition(x: number, y: number): void {
    this.container.position.set(x, y)
  }

  position(): { readonly x: number; readonly y: number } {
    return { x: this.container.position.x, y: this.container.position.y }
  }

  destroy(): void {
    this.container.destroy()
  }
}

interface Point {
  readonly x: number
  readonly y: number
}

/**
 * Owns the unit sprites: animated sprites from the asset catalog with a shadow
 * decal, placeholder-circle fallback when art is unavailable, and interpolated
 * positions. Movement is derived from the fixed-position delta (authoritative
 * `orderState` replaces this heuristic when orders land — tasks A6/V8).
 */
export class UnitLayer {
  private readonly units = new Map<number, UnitSprite>()
  private readonly viewport: Viewport
  private readonly library: AssetLibrary
  private readonly onUnitSelected: (id: number) => void
  private previous: ReadonlyMap<number, Point> | null = null
  private current: ReadonlyMap<number, Point> | null = null
  private currentTime = 0
  private previousTime = 0
  private readonly currentFixed = new Map<number, Point>()
  private readonly lastFixed = new Map<number, Point>()
  private readonly framesByKind = new Map<string, UnitFrames>()
  private readonly loadState = new Map<string, 'loading' | 'loaded' | 'failed'>()
  private shadowSprite: Sprite | null = null

  constructor(viewport: Viewport, library: AssetLibrary, onUnitSelected: (id: number) => void) {
    this.viewport = viewport
    this.library = library
    this.onUnitSelected = onUnitSelected
  }

  /** Preloads the shadow decal texture once (fire-and-forget). */
  preloadShadow(): void {
    if (this.shadowSprite !== null) {
      return
    }
    void this.library.staticSprite('terrain.shadow').then((sprite) => {
      if (sprite === null) {
        return
      }
      sprite.scale.set(0.8)
      this.shadowSprite = sprite
      for (const unit of this.units.values()) {
        unit.attachShadow(new Sprite(sprite.texture))
      }
    })
  }

  /** Preloads idle/run frames for a unit kind (fire-and-forget, cached). */
  preloadKind(owner: number, kind: UnitKind): void {
    const cacheKey = `${owner % FACTION_BY_OWNER.length}.${kind}`
    if (this.loadState.has(cacheKey)) {
      return
    }
    this.loadState.set(cacheKey, 'loading')
    void Promise.all([
      this.library.animated(frameKey(owner, kind, 'idle')),
      this.library.animated(frameKey(owner, kind, 'run'))
    ]).then(([idle, run]) => {
      if (idle === null || run === null) {
        this.loadState.set(cacheKey, 'failed')
        return
      }
      idle.play()
      run.play()
      const frames: UnitFrames = { idle, run }
      this.framesByKind.set(cacheKey, frames)
      this.loadState.set(cacheKey, 'loaded')
      for (const sprite of this.units.values()) {
        if (sprite.kind === kind && sprite.ownerFaction === owner % FACTION_BY_OWNER.length) {
          sprite.swapFrames(frames)
        }
      }
    })
  }

  private framesFor(owner: number, kind: UnitKind): UnitFrames | null {
    return this.framesByKind.get(`${owner % FACTION_BY_OWNER.length}.${kind}`) ?? null
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
        const kind: UnitKind = unit.kind ?? 'pawn'
        const frames = this.framesFor(unit.owner, kind)
        sprite = new UnitSprite(kind, unit.owner, frames)
        if (this.shadowSprite !== null) {
          sprite.attachShadow(new Sprite(this.shadowSprite.texture))
        }
        sprite.container.on('pointerdown', (event) => {
          event.stopPropagation()
          this.onUnitSelected(unit.id)
        })
        this.viewport.addChild(sprite.container)
        this.units.set(unit.id, sprite)
        this.preloadKind(unit.owner, kind)
      }
      const last = this.lastFixed.get(unit.id)
      const moving = last !== undefined && (last.x !== unit.x || last.y !== unit.y)
      sprite.setState(moving, unit.x < (last?.x ?? unit.x))
      sprite.setPosition(position.x, position.y)
    }
    for (const [id, sprite] of [...this.units]) {
      if (!seen.has(id)) {
        this.viewport.removeChild(sprite.container)
        sprite.destroy()
        this.units.delete(id)
        this.lastFixed.delete(id)
      }
    }

    this.previous = this.current
    this.previousTime = this.currentTime
    this.current = next
    this.currentTime = now
    this.lastFixed.clear()
    for (const [id, point] of this.currentFixed) {
      this.lastFixed.set(id, point)
    }
    this.currentFixed.clear()
    for (const [id, point] of nextFixed) {
      this.currentFixed.set(id, point)
    }
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
