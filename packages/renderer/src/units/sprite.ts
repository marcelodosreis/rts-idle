import { fixedToRenderPixels, UNIT_GEOMETRY } from '@rts/shared'
import { AnimatedSprite, Circle, Container, Graphics, Text, Texture, type Ticker } from 'pixi.js'
import type { FrameAnim, RenderUnit, SpriteAnim, UnitKind } from '../core/types.js'
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
import { ownerColor } from '../world/owner-color.js'
import { drawEconomyBar } from './economy.js'
import { type EconomyFrames, economyAnimation, FACTIONS, unitAssetKey } from './economy-animation.js'
import { facingForState } from './facing.js'
import { FALLBACK_GLYPH, type FallbackShape } from './fallback.js'

/** Visual radius of a unit cell (one tile diameter). */
export const UNIT_RADIUS = fixedToRenderPixels(UNIT_GEOMETRY.pawn.cellSize / 2)
/** Click hit radius: must stay small so a box-drag starting near a unit still
 * lands on empty ground and opens the selection box. */
export const CLICK_RADIUS = fixedToRenderPixels(UNIT_GEOMETRY.pawn.clickRadius)
/** Right-click target hit radius matching the larger sprite (selection ring stays UNIT_RADIUS). */
export const TARGET_RADIUS = fixedToRenderPixels(UNIT_GEOMETRY.pawn.targetRadius)
/** Height of the overhead health bar above the unit in render pixels. */
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
  readonly carrying?: boolean
  readonly building?: boolean
  readonly repairing?: boolean
}

/**
 * Attack-animation subtype per kind: the curated pack names them differently
 * (warrior_attack1/attack2, archer_shoot). Pawns have no attack pose, so they
 * reuse the axe "interact" swing as a temporary melee animation instead of
 * standing idle (swap for a real pose when the pack gains one).
 */
const ATTACK_SUBTYPE: Readonly<Record<UnitKind, string>> = { pawn: 'interact_axe', warrior: 'attack1', archer: 'shoot' }

export interface UnitFrames extends EconomyFrames {
  readonly idle: AnimatedSprite
  readonly run: AnimatedSprite
  readonly attack: AnimatedSprite | null
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

function cloneUnitFrames(template: UnitFrames): UnitFrames {
  return {
    idle: cloneAnimation(template.idle),
    run: cloneAnimation(template.run),
    attack: template.attack === null ? null : cloneAnimation(template.attack),
    build: template.build === null ? null : cloneAnimation(template.build),
    gather: template.gather === null ? null : cloneAnimation(template.gather),
    carryIdle: template.carryIdle === null ? null : cloneAnimation(template.carryIdle),
    carryRun: template.carryRun === null ? null : cloneAnimation(template.carryRun),
    repairRun: template.repairRun === null ? null : cloneAnimation(template.repairRun),
    repairInteract: template.repairInteract === null ? null : cloneAnimation(template.repairInteract)
  }
}

function installFrames(container: Container, frames: UnitFrames): void {
  const allFrames = [
    frames.idle,
    frames.run,
    frames.attack,
    frames.build,
    frames.gather,
    frames.repairRun,
    frames.repairInteract,
    frames.carryIdle,
    frames.carryRun
  ]
  for (const frame of allFrames) {
    if (frame !== null) {
      frame.visible = false
      container.addChild(frame)
    }
  }
}

/** Asset key for a unit animation: kind → manifest subtype (pawn_* / warrior_* / archer_*). */
export function frameKey(owner: number, kind: UnitKind, anim: FrameAnim): string {
  const subtype = anim === 'attack' ? ATTACK_SUBTYPE[kind] : anim
  return unitAssetKey(owner, kind, subtype)
}

function createFallbackVisual(kind: UnitKind, owner: number): { readonly body: Graphics; readonly label: Text } {
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
  /** Horizontal facing: 1 = right, -1 = left. Only updated while moving so
   * idle keeps looking the way the unit last walked. */
  private facing = 1
  /** Wall-clock timestamp until which the attack animation is shown. */
  private attackUntil = 0
  /** Last reported health, for the debug hook and e2e assertions. */
  private healthNow: { readonly current: number; readonly max: number } | null = null

  constructor(kind: UnitKind, owner: number, frames: UnitFrames | null) {
    this.kind = kind
    this.ownerFaction = owner % FACTIONS.length
    this.container = new Container()
    this.container.eventMode = 'static'
    this.container.cursor = 'pointer'
    // Circular hit area centered on the sprite so selection matches its bounds.
    this.container.hitArea = new Circle(0, 0, CLICK_RADIUS)
    if (frames !== null) {
      // Own private copies so this unit animates independently of its kind.
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
    const { moving, now, economy, carrying = false, building = false, repairing = false } = state
    if (this.frames === null) {
      return
    }
    // Only re-face while moving, so idle keeps looking the way the unit last
    // walked instead of snapping back to the right when it stops.
    this.facing = facingForState(this.facing, this.container.position.x, state)
    const attacking = now < this.attackUntil && this.frames.attack !== null
    let next: AnimatedSprite
    const economyFrame = economyAnimation(this.frames, { phase: economy?.phase, moving, carrying, building, repairing })
    if (
      economyFrame !== null &&
      (economyFrame === this.frames.gather ||
        economyFrame === this.frames.build ||
        economyFrame === this.frames.repairRun ||
        economyFrame === this.frames.repairInteract)
    ) {
      // Work animations outrank combat; the carry pose does not (see below).
      next = economyFrame
    } else if (attacking) {
      next = this.frames.attack!
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
    // Always make the target visible: `swapFrames`/the constructor add idle
    // hidden, so `body === next` alone must still reveal it.
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
    // Restart the swing from the first frame so every attack plays a full
    // cycle instead of resuming wherever the loop happened to be.
    this.frames?.attack?.gotoAndPlay(0)
  }

  faceToward(targetRenderX: number): void {
    if (this.frames === null) {
      return
    }
    this.facing = this.container.position.x < targetRenderX ? 1 : -1
    const scale = normalizedUnitScale(this.kind)
    this.body.scale.set(scale * this.facing, scale)
  }

  /**
   * Nominal wall-clock duration of one full attack cycle in milliseconds
   * (frames × 100 ms/frame from the manifest), or 0 when there is no attack
   * animation to show.
   */
  attackCycleMs(): number {
    const attack = this.frames?.attack
    return attack === undefined || attack === null ? 0 : attack.totalFrames * 100
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
    if (this.body === this.frames.run) {
      return 'run'
    }
    if (this.body === this.frames.attack) {
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
    if (this.body === this.frames.gather) {
      return 'gather'
    }
    if (this.body === this.frames.carryIdle) {
      return 'carry_idle'
    }
    if (this.body === this.frames.carryRun) {
      return 'carry_run'
    }
    return 'idle'
  }

  /** Whether the current body is actually in the container display list. */
  bodyInTree(): boolean {
    return this.container.children.includes(this.body)
  }

  /** Current horizontal facing (1 = right, -1 = left). */
  facingNow(): number {
    return this.facing
  }

  /** Current horizontal scale of the visible body (for debug/e2e assertions). */
  bodyScale(): number {
    return this.body.scale.x
  }

  /** Glyph letter when in fallback mode, else null. */
  glyphNow(): string | null {
    return this.frames === null ? FALLBACK_GLYPH[this.kind].letter : null
  }

  /** Fallback shape when in fallback mode, else null. */
  shapeNow(): FallbackShape | null {
    return this.frames === null ? FALLBACK_GLYPH[this.kind].shape : null
  }

  /** Advances the visible animated body (no-op for placeholder graphics). */
  advanceAnimation(ticker: Ticker): void {
    if (this.body instanceof AnimatedSprite) {
      this.body.update(ticker)
    }
  }
}
