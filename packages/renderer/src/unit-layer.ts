import { fixedToRenderPixels } from '@rts/shared'
import { AnimatedSprite, Circle, Container, Graphics, Texture, type Ticker } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import type { AssetLibrary } from './assets/asset-library.js'
import { interpolationAlpha, lerpPoint } from './interpolation.js'
import type { RenderUnit, UnitKind } from './types.js'

const OWNER_COLORS = [0x2e7d32, 0xc62828, 0x1565c0, 0xf9a825]

/** Visual radius of a unit placeholder in render pixels (1 tile = 64 px). */
export const UNIT_RADIUS = 20
/** Sprite scale: 192 px unit cells render about 0.75 tile tall (48 px). */
const SPRITE_SCALE = 0.25

const FACTION_BY_OWNER: readonly ('blue' | 'red' | 'purple' | 'yellow')[] = ['blue', 'red', 'purple', 'yellow']

interface UnitFrames {
  readonly idle: AnimatedSprite
  readonly run: AnimatedSprite
}

/**
 * A private copy of a template animation. `preloadKind` caches ONE template
 * pair per kind+faction; every unit must clone it because a Pixi display
 * object can belong to only one container (shared instances would make only
 * the last unit visible and couple their state/scale). Unit sprites are
 * centered on their tile (anchor 0.5/0.5) rather than feet-anchored.
 */
function cloneAnimation(template: AnimatedSprite): AnimatedSprite {
  const textures = template.textures.filter((texture): texture is Texture => texture instanceof Texture)
  const clone = new AnimatedSprite(textures, false)
  clone.anchor.set(0.5, 0.5)
  clone.animationSpeed = template.animationSpeed
  clone.play()
  return clone
}

/** Asset key for a unit animation: kind → manifest subtype (pawn_* / warrior_* / archer_*). */
function frameKey(owner: number, kind: UnitKind, anim: 'idle' | 'run'): string {
  const faction = FACTION_BY_OWNER[owner % FACTION_BY_OWNER.length] ?? 'blue'
  switch (kind) {
    case 'pawn':
      return `units.${faction}.pawn.pawn_${anim}`
    case 'warrior':
      return `units.${faction}.warrior.warrior_${anim}`
    case 'archer':
      return `units.${faction}.archer.archer_${anim}`
  }
}

class UnitSprite {
  readonly container: Container
  readonly kind: UnitKind
  readonly ownerFaction: number
  private body: AnimatedSprite | Graphics
  private readonly fallback: Graphics | null
  private frames: UnitFrames | null
  /** Horizontal facing: 1 = right, -1 = left. Only updated while moving so
   * idle keeps looking the way the unit last walked. */
  private facing = 1

  constructor(kind: UnitKind, owner: number, frames: UnitFrames | null) {
    this.kind = kind
    this.ownerFaction = owner % FACTION_BY_OWNER.length
    this.container = new Container()
    this.container.eventMode = 'static'
    this.container.cursor = 'pointer'
    // Circular hit area centered on the sprite so selection matches its bounds.
    this.container.hitArea = new Circle(0, 0, 24)
    if (frames !== null) {
      // Own private copies so this unit animates independently of its kind.
      this.frames = { idle: cloneAnimation(frames.idle), run: cloneAnimation(frames.run) }
      this.frames.idle.visible = false
      this.frames.run.visible = false
      // Both bodies must be in the display list so `setState` can reveal either.
      this.container.addChild(this.frames.idle)
      this.container.addChild(this.frames.run)
      this.body = this.frames.idle
      this.fallback = null
    } else {
      this.frames = null
      this.fallback = new Graphics()
      this.fallback.circle(0, 0, UNIT_RADIUS).fill(OWNER_COLORS[owner % OWNER_COLORS.length] ?? 0x000000)
      this.body = this.fallback
      this.container.addChild(this.fallback)
    }
  }

  /** Upgrades a placeholder sprite to animated frames once art loads. */
  swapFrames(template: UnitFrames): void {
    if (this.frames !== null) {
      return
    }
    this.frames = { idle: cloneAnimation(template.idle), run: cloneAnimation(template.run) }
    this.frames.idle.visible = false
    this.frames.run.visible = false
    if (this.fallback !== null) {
      this.container.removeChild(this.fallback)
      this.fallback.destroy()
    }
    // Both bodies must be in the display list so `setState` can reveal either.
    this.container.addChild(this.frames.idle)
    this.container.addChild(this.frames.run)
    this.body = this.frames.idle
  }

  /** Shows the run animation when moving and flips by horizontal direction. */
  setState(moving: boolean, facingLeft: boolean): void {
    if (this.frames === null) {
      return
    }
    // Only re-face while moving, so idle keeps looking the way the unit last
    // walked instead of snapping back to the right when it stops.
    if (moving) {
      this.facing = facingLeft ? -1 : 1
    }
    const next = moving ? this.frames.run : this.frames.idle
    if (this.body !== next) {
      this.body.visible = false
    }
    // Always make the target visible: `swapFrames`/the constructor add idle
    // hidden, so `body === next` alone must still reveal it.
    next.visible = true
    this.body = next
    this.body.scale.set(SPRITE_SCALE * this.facing, SPRITE_SCALE)
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

  /** Current animation frame when animated, else `null` (placeholder). */
  animationFrame(): number | null {
    if (this.frames === null || !(this.body instanceof AnimatedSprite)) {
      return null
    }
    return this.body.currentFrame
  }

  /** Whether the current body (sprite or fallback) is visible. */
  bodyVisible(): boolean {
    return this.body.visible
  }

  /** Which animation is currently shown: `run`, `idle`, or `fallback`. */
  stateName(): 'idle' | 'run' | 'fallback' {
    if (this.frames === null) {
      return 'fallback'
    }
    return this.body === this.frames.run ? 'run' : 'idle'
  }

  /** Whether the current body is actually in the container display list. */
  bodyInTree(): boolean {
    return this.container.children.includes(this.body)
  }

  /** Current horizontal facing (1 = right, -1 = left). */
  facingNow(): number {
    return this.facing
  }

  /** Advances the visible animated body (no-op for placeholder graphics). */
  advanceAnimation(ticker: Ticker): void {
    if (this.body instanceof AnimatedSprite) {
      this.body.update(ticker)
    }
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

  constructor(viewport: Viewport, library: AssetLibrary, onUnitSelected: (id: number) => void) {
    this.viewport = viewport
    this.library = library
    this.onUnitSelected = onUnitSelected
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
    // `lastFixed` already holds the previous frame's positions (set last
    // present), so the loop above compared current vs previous without lag.
    this.currentFixed.clear()
    for (const [id, point] of nextFixed) {
      this.currentFixed.set(id, point)
    }
    // Prepare `lastFixed` for the next present.
    this.lastFixed.clear()
    for (const [id, point] of nextFixed) {
      this.lastFixed.set(id, point)
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

  /** Advances every animated sprite's frame by the visual tick's deltaTime. */
  advanceAnimations(ticker: Ticker): void {
    for (const sprite of this.units.values()) {
      sprite.advanceAnimation(ticker)
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

  /** Current animation frame of a unit's sprite, or `null` in fallback mode. */
  animationFrame(id: number): number | null {
    const sprite = this.units.get(id)
    if (sprite === undefined) {
      return null
    }
    return sprite.animationFrame()
  }

  /** Debug: is the unit's body currently visible and which frame is shown. */
  spriteState(id: number): {
    readonly visible: boolean
    readonly frame: number | null
    readonly anim: 'idle' | 'run' | 'fallback'
    readonly inTree: boolean
    readonly facing: number
  } | null {
    const sprite = this.units.get(id)
    if (sprite === undefined) {
      return null
    }
    return {
      visible: sprite.bodyVisible(),
      frame: sprite.animationFrame(),
      anim: sprite.stateName(),
      inTree: sprite.bodyInTree(),
      facing: sprite.facingNow()
    }
  }
}
