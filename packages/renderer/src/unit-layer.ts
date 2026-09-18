import { fixedToRenderPixels } from '@rts/shared'
import type { Ticker } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import type { AssetLibrary } from './assets/asset-library.js'
import { interpolationAlpha, lerpPoint } from './interpolation.js'
import type { RenderUnit, UnitKind } from './types.js'
import { FACTION_BY_OWNER, frameKey, UNIT_RADIUS, type UnitFrames, UnitSprite } from './unit-sprite.js'

interface Point {
  readonly x: number
  readonly y: number
}

/**
 * Owns the unit sprites: animated sprites from the asset catalog with a shadow
 * decal, placeholder-circle fallback when art is unavailable, and interpolated
 * positions. Movement is derived from the fixed-position delta; combat feedback
 * (health bars, attack animations) is driven by the authoritative frame.
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

  /** Preloads idle/run/attack frames for a unit kind (fire-and-forget, cached). */
  preloadKind(owner: number, kind: UnitKind): void {
    const cacheKey = `${owner % FACTION_BY_OWNER.length}.${kind}`
    if (this.loadState.has(cacheKey)) {
      return
    }
    this.loadState.set(cacheKey, 'loading')
    void Promise.all([
      this.library.animated(frameKey(owner, kind, 'idle')),
      this.library.animated(frameKey(owner, kind, 'run')),
      this.library.animated(frameKey(owner, kind, 'attack'))
    ]).then(([idle, run, attack]) => {
      if (idle === null || run === null) {
        this.loadState.set(cacheKey, 'failed')
        return
      }
      idle.play()
      run.play()
      attack?.play()
      const frames: UnitFrames = { idle, run, attack }
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
      // The authoritative orderState drives run/idle; the position delta covers
      // the chase case (a unit with an ATTACK order that is still moving toward
      // its target reports 'attacking' but is visibly running).
      const deltaMoved = last !== undefined && (last.x !== unit.x || last.y !== unit.y)
      const moving =
        unit.orderState === 'moving' ||
        ((unit.orderState === 'attacking' || unit.orderState === 'attack_move') && deltaMoved)
      sprite.setHealth(unit.hp, unit.maxHp)
      sprite.setState(moving, unit.x < (last?.x ?? unit.x), now)
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

  /** Starts the attack animation for a unit (wall-clock until, presentation). */
  beginAttack(id: number, until: number): void {
    const sprite = this.units.get(id)
    if (sprite !== undefined) {
      sprite.beginAttack(until)
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

  /**
   * Topmost unit within a small radius of a world point (render pixels), or
   * `null`. Later-spawned containers sit on top, so the last match wins —
   * this mirrors what the player sees and is used for right-click targeting.
   */
  unitAt(x: number, y: number): number | null {
    const threshold = UNIT_RADIUS * UNIT_RADIUS
    let topmost: number | null = null
    for (const [id, sprite] of this.units) {
      const position = sprite.position()
      const dx = position.x - x
      const dy = position.y - y
      if (dx * dx + dy * dy <= threshold) {
        topmost = id
      }
    }
    return topmost
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

  /** Last reported health of a unit, or `null` when unknown. */
  health(id: number): { readonly current: number; readonly max: number } | null {
    const sprite = this.units.get(id)
    if (sprite === undefined) {
      return null
    }
    return sprite.health()
  }

  /** Debug: is the unit's body currently visible and which frame is shown. */
  spriteState(id: number): {
    readonly visible: boolean
    readonly frame: number | null
    readonly anim: 'idle' | 'run' | 'attack' | 'fallback'
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
