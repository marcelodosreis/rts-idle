import { fixedToRenderPixels } from '@rts/shared'
import type { AnimatedSprite, Container, Ticker } from 'pixi.js'
import type { AssetLibrary } from '../assets/asset-library.js'
import { interpolationAlpha, lerpPoint } from '../core/interpolation.js'
import type { RenderUnit, UnitKind, UnitSpriteState } from '../core/types.js'
import { frameCountToPixiAnimationSpeed, STANDARD_ATTACK_CYCLE_MS } from '../core/visual-timing.js'
import { economyFrameKey, FACTIONS } from './economy-animation.js'
import { LANCER_ATTACK_DIRECTIONS, lancerAttackFrameKey } from './lancer-animation.js'
import { frameKey, healEffectKey, TARGET_RADIUS, type UnitFrames, UnitSprite } from './sprite.js'

interface WorldRenderPoint {
  readonly x: number
  readonly y: number
}

interface FixedPoint {
  readonly x: number
  readonly y: number
}

function normalizeAttackSpeed(sprite: AnimatedSprite): void {
  sprite.animationSpeed = frameCountToPixiAnimationSpeed(sprite.totalFrames, STANDARD_ATTACK_CYCLE_MS)
}

/**
 * Owns the unit sprites: animated sprites from the asset catalog with a shadow
 * decal, placeholder-circle fallback when art is unavailable, and interpolated
 * positions. Movement is derived from the fixed-position delta; combat feedback
 * (health bars, attack animations) is driven by the authoritative frame.
 */
export class UnitLayer {
  private readonly units = new Map<number, UnitSprite>()
  private readonly unitsLayer: Container
  private readonly library: AssetLibrary
  private previous: ReadonlyMap<number, WorldRenderPoint> | null = null
  private current: ReadonlyMap<number, WorldRenderPoint> | null = null
  private currentTime = 0
  private previousTime = 0
  private readonly currentFixed = new Map<number, FixedPoint>()
  private readonly lastFixed = new Map<number, FixedPoint>()
  private readonly framesByKind = new Map<string, UnitFrames>()
  private readonly loadState = new Map<string, 'loading' | 'loaded' | 'failed'>()

  constructor(unitsLayer: Container, library: AssetLibrary) {
    this.unitsLayer = unitsLayer
    this.library = library
  }

  private async loadAttackFrames(
    owner: number,
    kind: UnitKind
  ): Promise<{
    readonly attack: AnimatedSprite | null
    readonly attackVariants: Readonly<Record<(typeof LANCER_ATTACK_DIRECTIONS)[number], AnimatedSprite | null>> | null
  }> {
    if (kind !== 'lancer') {
      return { attack: await this.library.animated(frameKey(owner, kind, 'attack')), attackVariants: null }
    }
    const variants = await Promise.all(
      LANCER_ATTACK_DIRECTIONS.map((direction) => this.library.animated(lancerAttackFrameKey(owner, direction)))
    )
    return {
      attack: null,
      attackVariants: Object.fromEntries(
        LANCER_ATTACK_DIRECTIONS.map((direction, index) => [direction, variants[index] ?? null])
      ) as Record<(typeof LANCER_ATTACK_DIRECTIONS)[number], AnimatedSprite | null>
    }
  }

  /** Preloads idle/run/attack frames for a unit kind (fire-and-forget, cached). */
  preloadKind(owner: number, kind: UnitKind): void {
    const cacheKey = `${owner % FACTIONS.length}.${kind}`
    if (this.loadState.has(cacheKey)) {
      return
    }
    this.loadState.set(cacheKey, 'loading')
    void Promise.all([
      this.library.animated(frameKey(owner, kind, 'idle')),
      this.library.animated(frameKey(owner, kind, 'run')),
      this.library.animated(healEffectKey(owner)),
      this.loadAttackFrames(owner, kind),
      kind === 'pawn' ? this.library.animated(economyFrameKey(owner, 'build')) : Promise.resolve(null),
      kind === 'pawn' ? this.library.animated(economyFrameKey(owner, 'repairRun')) : Promise.resolve(null),
      kind === 'pawn' ? this.library.animated(economyFrameKey(owner, 'repairInteract')) : Promise.resolve(null),
      kind === 'pawn' ? this.library.animated(economyFrameKey(owner, 'gather')) : Promise.resolve(null),
      kind === 'pawn' ? this.library.animated(economyFrameKey(owner, 'carryIdle')) : Promise.resolve(null),
      kind === 'pawn' ? this.library.animated(economyFrameKey(owner, 'carryRun')) : Promise.resolve(null)
    ]).then(([idle, run, healEffect, attackFrames, build, repairRun, repairInteract, gather, carryIdle, carryRun]) => {
      if (idle === null || run === null) {
        this.loadState.set(cacheKey, 'failed')
        return
      }
      idle.play()
      run.play()
      if (attackFrames.attack !== null) {
        normalizeAttackSpeed(attackFrames.attack)
        attackFrames.attack.play()
      }
      for (const attack of Object.values(attackFrames.attackVariants ?? {})) {
        if (attack !== null) {
          normalizeAttackSpeed(attack)
          attack.play()
        }
      }
      const frames: UnitFrames = {
        idle,
        run,
        attack: attackFrames.attack,
        attackVariants: attackFrames.attackVariants,
        healEffect,
        build,
        repairRun,
        repairInteract,
        gather,
        carryIdle,
        carryRun
      }
      this.framesByKind.set(cacheKey, frames)
      this.loadState.set(cacheKey, 'loaded')
      for (const sprite of this.units.values()) {
        if (sprite.kind === kind && sprite.ownerFaction === owner % FACTIONS.length) {
          sprite.swapFrames(frames)
        }
      }
    })
  }

  private framesFor(owner: number, kind: UnitKind): UnitFrames | null {
    return this.framesByKind.get(`${owner % FACTIONS.length}.${kind}`) ?? null
  }

  /** Returns the existing sprite or creates and registers a new one. */
  private ensureSprite(unit: RenderUnit): UnitSprite {
    const existing = this.units.get(unit.id)
    if (existing !== undefined) {
      return existing
    }
    const kind: UnitKind = unit.kind ?? 'pawn'
    const sprite = new UnitSprite(kind, unit.owner, this.framesFor(unit.owner, kind))
    this.unitsLayer.addChild(sprite.container)
    this.units.set(unit.id, sprite)
    this.preloadKind(unit.owner, kind)
    return sprite
  }

  private applyUnitFrame(unit: RenderUnit, sprite: UnitSprite, last: FixedPoint | undefined, now: number): void {
    // The authoritative orderState drives run/idle; the position delta covers
    // the chase case (a unit with an ATTACK order that is still moving toward
    // its target reports 'attacking' but is visibly running).
    const deltaMoved = last !== undefined && (last.x !== unit.x || last.y !== unit.y)
    const moving =
      unit.orderState === 'moving' ||
      ((unit.orderState === 'attacking' || unit.orderState === 'attack_move' || unit.orderState === 'patrol') &&
        deltaMoved) ||
      (unit.orderState === 'repairing' && deltaMoved)
    sprite.setHealth(unit.hp, unit.maxHp)
    sprite.setState({
      moving,
      facingLeft: unit.x < (last?.x ?? unit.x),
      ...(unit.lookAtX === undefined ? {} : { lookAtX: fixedToRenderPixels(unit.lookAtX) }),
      now,
      economy: unit.economy,
      carrying: unit.carrying ?? false,
      building: unit.orderState === 'building',
      repairing: unit.orderState === 'repairing',
      healing: unit.orderState === 'healing'
    })
    sprite.setEconomyBar(unit.economy)
  }

  private removeStaleSprites(seen: ReadonlySet<number>): void {
    for (const [id, sprite] of [...this.units]) {
      if (!seen.has(id)) {
        this.unitsLayer.removeChild(sprite.container)
        sprite.destroy()
        this.units.delete(id)
        this.lastFixed.delete(id)
      }
    }
  }

  private commitPositions(
    next: ReadonlyMap<number, WorldRenderPoint>,
    nextFixed: ReadonlyMap<number, FixedPoint>,
    now: number
  ): void {
    this.previous = this.current
    this.previousTime = this.currentTime
    this.current = next
    this.currentTime = now
    // `lastFixed` already holds the previous frame's positions (set by the last
    // present), so the loop above compared current vs previous without lag.
    this.currentFixed.clear()
    for (const [id, point] of nextFixed) {
      this.currentFixed.set(id, point)
    }
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

  /** Diffs the given units against the current sprites and records the frame. */
  present(units: readonly RenderUnit[], now: number): void {
    const seen = new Set<number>()
    const next = new Map<number, WorldRenderPoint>()
    const nextFixed = new Map<number, FixedPoint>()
    for (const unit of units) {
      seen.add(unit.id)
      const position = { x: fixedToRenderPixels(unit.x), y: fixedToRenderPixels(unit.y) }
      next.set(unit.id, position)
      nextFixed.set(unit.id, { x: unit.x, y: unit.y })
      const sprite = this.ensureSprite(unit)
      this.applyUnitFrame(unit, sprite, this.lastFixed.get(unit.id), now)
      sprite.setPosition(position.x, position.y)
    }
    this.removeStaleSprites(seen)
    this.commitPositions(next, nextFixed, now)
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

  /** Starts the attack animation for a unit (wall-clock, presentation only). */
  beginAttack(id: number, now: number): void {
    const sprite = this.units.get(id)
    if (sprite !== undefined) {
      const cycle = sprite.attackCycleMs()
      sprite.beginAttack(now + (cycle > 0 ? cycle : 250))
    }
  }

  beginHealEffect(id: number): void {
    this.units.get(id)?.beginHealEffect()
  }

  /** Current interpolated sprite position in world space (render pixels). */
  position(id: number): { readonly x: number; readonly y: number } | undefined {
    const sprite = this.units.get(id)
    if (sprite === undefined) {
      return undefined
    }
    return sprite.position()
  }

  /**
   * Topmost unit within the target hit radius of a world point (render
   * pixels), or `null`. Later-spawned containers sit on top, so the last match
   * wins — this mirrors what the player sees and is used for right-click
   * targeting (the bigger sprite, not the selection ring).
   */
  unitAt(x: number, y: number): number | null {
    const threshold = TARGET_RADIUS * TARGET_RADIUS
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

  /** Flips a unit to face the fixed x of its attack target (never fights back to front). */
  faceToward(id: number, targetFixedX: number, targetFixedY: number): void {
    const sprite = this.units.get(id)
    if (sprite !== undefined) {
      sprite.faceToward(fixedToRenderPixels(targetFixedX), fixedToRenderPixels(targetFixedY))
    }
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
  spriteState(id: number): UnitSpriteState | null {
    const sprite = this.units.get(id)
    if (sprite === undefined) {
      return null
    }
    return {
      visible: sprite.bodyVisible(),
      frame: sprite.animationFrame(),
      anim: sprite.stateName(),
      inTree: sprite.bodyInTree(),
      facing: sprite.facingNow(),
      scale: sprite.bodyScale(),
      glyph: sprite.glyphNow(),
      shape: sprite.shapeNow()
    }
  }
}
