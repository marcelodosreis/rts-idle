import { AnimatedSprite, Circle, Container, Graphics, Text, Texture, type Ticker } from 'pixi.js'
import {
  BAR_BACKGROUND,
  BAR_BORDER,
  BAR_HEIGHT,
  BAR_RADIUS,
  BAR_WIDTH,
  clampRatio,
  drawProgressBar,
  hpColor
} from './progress-bar.js'
import type { RenderUnit, UnitKind } from './types.js'
import { drawEconomyBar, type EconomyFrames, economyAnimation, FACTION_BY_OWNER } from './unit-economy.js'
import { FALLBACK_GLYPH, type FallbackShape } from './unit-fallback.js'

const OWNER_COLORS = [0x2e7d32, 0xc62828, 0x1565c0, 0xf9a825]

/** Visual radius of a unit placeholder / selection ring (1 tile = 64 px). */
export const UNIT_RADIUS = 28
/** Click hit radius: must stay small so a box-drag starting near a unit still
 * lands on empty ground and opens the selection box. */
export const CLICK_RADIUS = 28
/** Right-click target hit radius matching the larger sprite (selection ring stays UNIT_RADIUS). */
export const TARGET_RADIUS = 44
/** Sprite scale: 192 px unit cells render about 1.5 tiles tall (96 px). */
const SPRITE_SCALE = 0.5
/** Height of the overhead health bar above the unit in render pixels. */
const HP_BAR_OFFSET_Y = -34

export { FACTION_BY_OWNER } from './unit-economy.js'

/**
 * Attack-animation subtype per kind: the curated pack names them differently
 * (warrior_attack1/attack2, archer_shoot). Pawns have no attack pose, so they
 * reuse the axe "interact" swing as a temporary melee animation instead of
 * standing idle (swap for a real pose when the pack gains one).
 */
const ATTACK_SUBTYPE: Record<UnitKind, string> = { pawn: 'interact_axe', warrior: 'attack1', archer: 'shoot' }

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
    gather: template.gather === null ? null : cloneAnimation(template.gather),
    carryIdle: template.carryIdle === null ? null : cloneAnimation(template.carryIdle),
    carryRun: template.carryRun === null ? null : cloneAnimation(template.carryRun)
  }
}

function installFrames(container: Container, frames: UnitFrames): void {
  const allFrames = [frames.idle, frames.run, frames.attack, frames.gather, frames.carryIdle, frames.carryRun]
  for (const frame of allFrames) {
    if (frame !== null) {
      frame.visible = false
      container.addChild(frame)
    }
  }
}

/** Asset key for a unit animation: kind → manifest subtype (pawn_* / warrior_* / archer_*). */
export function frameKey(owner: number, kind: UnitKind, anim: 'idle' | 'run' | 'attack'): string {
  const faction = FACTION_BY_OWNER[owner % FACTION_BY_OWNER.length] ?? 'blue'
  const subtype = anim === 'attack' ? ATTACK_SUBTYPE[kind] : anim
  switch (kind) {
    case 'pawn':
      return `units.${faction}.pawn.pawn_${subtype}`
    case 'warrior':
      return `units.${faction}.warrior.warrior_${subtype}`
    case 'archer':
      return `units.${faction}.archer.archer_${subtype}`
  }
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
    this.ownerFaction = owner % FACTION_BY_OWNER.length
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
      const ownerColor = OWNER_COLORS[owner % OWNER_COLORS.length] ?? 0x000000
      this.fallback = new Graphics()
      const glyph = FALLBACK_GLYPH[kind]
      switch (glyph.shape) {
        case 'circle':
          this.fallback.circle(0, 0, UNIT_RADIUS).fill(ownerColor)
          this.fallback.circle(0, 0, UNIT_RADIUS).stroke({ color: 0x000000, width: 3, alpha: 0.3 })
          break
        case 'square':
          this.fallback.roundRect(-22, -22, 44, 44, 6).fill(ownerColor)
          this.fallback.roundRect(-22, -22, 44, 44, 6).stroke({ color: 0x000000, width: 3, alpha: 0.3 })
          break
        case 'triangle':
          this.fallback.moveTo(0, -28).lineTo(-24, 16).lineTo(24, 16).closePath().fill(ownerColor)
          this.fallback
            .moveTo(0, -28)
            .lineTo(-24, 16)
            .lineTo(24, 16)
            .closePath()
            .stroke({ color: 0x000000, width: 3, alpha: 0.3 })
          break
      }
      this.body = this.fallback
      this.container.addChild(this.fallback)
      this.label = new Text({
        text: glyph.letter,
        style: { fontSize: 22, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 3 } }
      })
      this.label.anchor.set(0.5, 0.5)
      this.label.eventMode = 'none'
      this.label.resolution = 2
      this.container.addChild(this.label)
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

  /** Shows idle, run, or attack by current state and flips by direction. */
  setState(moving: boolean, facingLeft: boolean, now: number, economy: RenderUnit['economy'], carrying = false): void {
    if (this.frames === null) {
      return
    }
    // Only re-face while moving, so idle keeps looking the way the unit last
    // walked instead of snapping back to the right when it stops.
    if (moving) {
      this.facing = facingLeft ? -1 : 1
    }
    const attacking = now < this.attackUntil && this.frames.attack !== null
    let next: AnimatedSprite
    const economyFrame = economyAnimation(this.frames, economy?.phase, moving, carrying)
    if (economyFrame !== null && economyFrame === this.frames.gather) {
      // Gathering outranks combat; the carry pose does not (see below).
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
    this.body.scale.set(SPRITE_SCALE * this.facing, SPRITE_SCALE)
  }

  setEconomyBar(economy: RenderUnit['economy']): void {
    drawEconomyBar(this.economyBar, economy)
  }

  /** Starts the attack animation for `until` (wall clock, presentation only). */
  beginAttack(until: number): void {
    this.attackUntil = until
    // Restart the swing from the first frame so every attack plays a full
    // cycle instead of resuming wherever the loop happened to be.
    this.frames?.attack?.gotoAndPlay(0)
  }

  /**
   * Flips the sprite to face an x position (world render pixels). Used when a
   * unit fires so it never attacks from behind, even while standing.
   */
  faceToward(targetRenderX: number): void {
    // The fallback circle has no facing, and its body must keep its drawn
    // scale. Applying SPRITE_SCALE here shrank the placeholder on first attack.
    if (this.frames === null) {
      return
    }
    this.facing = this.container.position.x < targetRenderX ? 1 : -1
    this.body.scale.set(SPRITE_SCALE * this.facing, SPRITE_SCALE)
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

  /** Last reported health, or `null` when the unit is not combat-capable. */
  health(): { readonly current: number; readonly max: number } | null {
    return this.healthNow
  }

  /** Updates the overhead health bar; hidden when full or health is unknown. */
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
    if (current >= max) {
      this.hpBar.visible = false
      return
    }
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
  stateName(): 'idle' | 'run' | 'attack' | 'gather' | 'carry_idle' | 'carry_run' | 'fallback' {
    if (this.frames === null) {
      return 'fallback'
    }
    if (this.body === this.frames.run) {
      return 'run'
    }
    if (this.body === this.frames.attack) {
      return 'attack'
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
