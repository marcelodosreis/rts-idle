import { fixedToRenderPixels, type ResourceType, UNIT_GEOMETRY } from '@rts/shared'
import { AnimatedSprite, Circle, Container, Graphics, type Text, type Ticker } from 'pixi.js'
import type { FrameAnim, RenderUnit, SpriteAnim, UnitKind } from '../core/types.js'
import { STANDARD_ATTACK_CYCLE_MS } from '../core/visual-timing.js'
import {
  BAR_BACKGROUND,
  BAR_BORDER,
  BAR_HEIGHT,
  BAR_RADIUS,
  BAR_WIDTH,
  clampRatio,
  drawProgressBar,
  hpColor
} from '../effects/progress-bar.js'
import { drawEconomyBar } from './economy.js'
import { economyAnimation, FACTIONS, unitAssetKey } from './economy-animation.js'
import { facingForState } from './facing.js'
import { FALLBACK_GLYPH, type FallbackShape } from './fallback.js'
import { createFallbackVisual } from './fallback-visual.js'
import { type LancerAttackDirection, lancerDirectionForDelta } from './lancer-animation.js'
import { cloneUnitFrames, installFrames, type UnitFrames } from './unit-frames.js'

export type { UnitFrames } from './unit-frames.js'

export const UNIT_RADIUS = fixedToRenderPixels(UNIT_GEOMETRY.pawn.cellSize / 2)
export const CLICK_RADIUS = fixedToRenderPixels(UNIT_GEOMETRY.pawn.clickRadius)
export const TARGET_RADIUS = fixedToRenderPixels(UNIT_GEOMETRY.pawn.targetRadius)
const HP_BAR_OFFSET_Y = -34

export function normalizedUnitScale(kind: UnitKind): number {
  const geometry = UNIT_GEOMETRY[kind]
  return geometry.targetVisibleHeight / geometry.sourceVisibleHeight
}

/** Frame selection inputs for {@link UnitSprite.setState}. */
export interface UnitFrameState {
  readonly moving: boolean
  readonly facingLeft: boolean
  readonly lookAtX?: number
  readonly now: number
  readonly economy: RenderUnit['economy']
  readonly material?: ResourceType
  readonly carrying?: boolean
  readonly building?: boolean
  readonly repairing?: boolean
  readonly healing?: boolean
}

const ATTACK_SUBTYPE: Readonly<Record<UnitKind, string>> = {
  pawn: 'interact_axe',
  warrior: 'attack1',
  archer: 'shoot',
  lancer: 'downright_attack',
  monk: 'heal'
}

/** Asset key for a unit animation: kind → manifest subtype (pawn_* / warrior_* / archer_*). */
export function frameKey(owner: number, kind: UnitKind, anim: FrameAnim): string {
  const subtype = anim === 'attack' ? ATTACK_SUBTYPE[kind] : anim
  return unitAssetKey(owner, kind, subtype)
}

export function healEffectKey(owner: number): string {
  return unitAssetKey(owner, 'monk', 'heal_effect')
}

export class UnitSprite {
  readonly container: Container
  readonly kind: UnitKind
  readonly ownerFaction: number
  private body: AnimatedSprite | Graphics
  private readonly fallback: Graphics | null
  private frames: UnitFrames | null
  private readonly hpBar: Graphics
  private readonly economyBar: Graphics
  private label: Text | null = null
  private facing = 1
  private attackUntil = 0
  private attackDirection: LancerAttackDirection = 'downright'
  private healthNow: { readonly current: number; readonly max: number } | null = null

  constructor(kind: UnitKind, owner: number, frames: UnitFrames | null) {
    this.kind = kind
    this.ownerFaction = owner % FACTIONS.length
    this.container = new Container()
    this.container.eventMode = 'static'
    this.container.cursor = 'pointer'
    this.container.hitArea = new Circle(0, 0, CLICK_RADIUS)
    if (frames !== null) {
      this.frames = cloneUnitFrames(frames)
      installFrames(this.container, this.frames)
      this.body = this.frames.idle
      this.fallback = null
    } else {
      this.frames = null
      const fallback = createFallbackVisual(kind, owner)
      this.fallback = fallback.body
      this.body = fallback.body
      this.container.addChild(fallback.body, fallback.label)
      this.label = fallback.label
    }
    this.hpBar = new Graphics()
    this.hpBar.visible = false
    this.hpBar.eventMode = 'none'
    this.container.addChild(this.hpBar)
    this.economyBar = new Graphics()
    this.economyBar.visible = false
    this.economyBar.eventMode = 'none'
    this.container.addChild(this.economyBar)
  }

  /** Upgrades a placeholder sprite to animated frames once art loads. */
  swapFrames(template: UnitFrames): void {
    if (this.frames !== null) {
      return
    }
    this.frames = cloneUnitFrames(template)
    if (this.fallback !== null) {
      this.container.removeChild(this.fallback)
      this.fallback.destroy()
    }
    if (this.label !== null) {
      this.container.removeChild(this.label)
      this.label.destroy()
      this.label = null
    }
    installFrames(this.container, this.frames)
    this.body = this.frames.idle
  }

  setState(state: UnitFrameState): void {
    const {
      moving,
      now,
      economy,
      material,
      carrying = false,
      building = false,
      repairing = false,
      healing = false
    } = state
    if (this.frames === null) {
      return
    }
    this.facing = facingForState(this.facing, this.container.position.x, state)
    const attack = this.frames.attackVariants?.[this.attackDirection] ?? this.frames.attack
    const attacking = (now < this.attackUntil || healing) && attack !== null && attack !== undefined
    let next: AnimatedSprite
    const economyFrame = economyAnimation(this.frames, {
      phase: economy?.phase,
      moving,
      carrying,
      building,
      repairing,
      ...(material === undefined ? {} : { material })
    })
    if (
      economyFrame !== null &&
      (economyFrame === this.frames.gather ||
        economyFrame === this.frames.gatherAxe ||
        economyFrame === this.frames.build ||
        economyFrame === this.frames.repairRun ||
        economyFrame === this.frames.repairInteract)
    ) {
      next = economyFrame
    } else if (attacking) {
      next = attack!
    } else if (economyFrame !== null && economyFrame !== undefined) {
      next = economyFrame
    } else if (moving) {
      next = this.frames.run
    } else {
      next = this.frames.idle
    }
    if (this.body !== next) {
      this.body.visible = false
    }
    next.visible = true
    this.body = next
    const scale = normalizedUnitScale(this.kind)
    this.body.scale.set(scale * this.facing, scale)
  }

  setEconomyBar(economy: RenderUnit['economy']): void {
    drawEconomyBar(this.economyBar, economy)
  }
  beginAttack(until: number): void {
    this.attackUntil = until
    this.frames?.attack?.gotoAndPlay(0)
  }

  beginHealEffect(): void {
    const effect = this.frames?.healEffect
    if (effect === null || effect === undefined) {
      return
    }
    const scale = normalizedUnitScale(this.kind)
    effect.scale.set(scale, scale)
    effect.gotoAndPlay(0)
    effect.visible = true
    effect.onComplete = () => {
      effect.visible = false
    }
  }

  faceToward(targetRenderX: number, targetRenderY: number): void {
    if (this.frames === null) {
      return
    }
    this.facing = this.container.position.x < targetRenderX ? 1 : -1
    if (this.kind === 'lancer') {
      this.attackDirection = lancerDirectionForDelta(
        targetRenderX - this.container.position.x,
        targetRenderY - this.container.position.y
      )
    }
    this.applyScale()
  }

  private applyScale(): void {
    const scale = normalizedUnitScale(this.kind)
    this.body.scale.set(scale * this.facing, scale)
  }

  /**
   * Nominal wall-clock duration of one full attack cycle in milliseconds
   * (frames × 100 ms/frame from the manifest), or 0 when there is no attack
   * animation to show.
   */
  attackCycleMs(): number {
    const attack = this.frames?.attackVariants?.[this.attackDirection] ?? this.frames?.attack
    return attack === undefined || attack === null ? 0 : STANDARD_ATTACK_CYCLE_MS
  }

  health(): { readonly current: number; readonly max: number } | null {
    return this.healthNow
  }

  setHealth(current: number | undefined, max: number | undefined): void {
    if (current === undefined || max === undefined || max <= 0) {
      this.healthNow = null
      if (this.hpBar.visible) {
        this.hpBar.visible = false
      }
      return
    }
    this.healthNow = { current, max }
    const ratio = clampRatio(current, max)
    this.hpBar.visible = true
    this.hpBar.clear()
    drawProgressBar(this.hpBar, {
      x: -BAR_WIDTH / 2,
      y: HP_BAR_OFFSET_Y,
      width: BAR_WIDTH,
      height: BAR_HEIGHT,
      ratio,
      fillColor: hpColor(ratio),
      background: BAR_BACKGROUND,
      border: BAR_BORDER,
      radius: BAR_RADIUS
    })
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

  /** Which animation is currently shown. */
  stateName(): SpriteAnim {
    if (this.frames === null) {
      return 'fallback'
    }
    if (
      this.body === this.frames.run ||
      this.body === this.frames.travelAxeRun ||
      this.body === this.frames.travelPickaxeRun
    ) {
      return 'run'
    }
    if (
      this.body === this.frames.attack ||
      Object.values(this.frames.attackVariants ?? {}).includes(this.body as AnimatedSprite)
    ) {
      return 'attack'
    }
    if (this.body === this.frames.build) {
      return 'build'
    }
    if (this.body === this.frames.repairRun) {
      return 'repair_run'
    }
    if (this.body === this.frames.repairInteract) {
      return 'repair_interact'
    }
    if (this.body === this.frames.gather || this.body === this.frames.gatherAxe) {
      return 'gather'
    }
    if (this.body === this.frames.carryIdle || this.body === this.frames.carryWoodIdle) {
      return 'carry_idle'
    }
    if (this.body === this.frames.carryRun || this.body === this.frames.carryWoodRun) {
      return 'carry_run'
    }
    return 'idle'
  }

  bodyInTree(): boolean {
    return this.container.children.includes(this.body)
  }

  facingNow(): number {
    return this.facing
  }

  bodyScale(): number {
    return this.body.scale.x
  }

  glyphNow(): string | null {
    return this.frames === null ? FALLBACK_GLYPH[this.kind].letter : null
  }

  shapeNow(): FallbackShape | null {
    return this.frames === null ? FALLBACK_GLYPH[this.kind].shape : null
  }

  advanceAnimation(ticker: Ticker): void {
    if (this.body instanceof AnimatedSprite) {
      this.body.update(ticker)
    }
    const healEffect = this.frames?.healEffect
    if (healEffect?.visible) {
      healEffect.update(ticker)
    }
  }
}
