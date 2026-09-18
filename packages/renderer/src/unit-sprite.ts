import { AnimatedSprite, Circle, Container, Graphics, Texture, type Ticker } from 'pixi.js'
import { HP_BAR_HEIGHT, HP_BAR_WIDTH, hpColor, hpFillWidth, hpRatio } from './hp-bar.js'
import type { UnitKind } from './types.js'

const OWNER_COLORS = [0x2e7d32, 0xc62828, 0x1565c0, 0xf9a825]

/** Visual radius of a unit placeholder in render pixels (1 tile = 64 px). */
export const UNIT_RADIUS = 20
/** Sprite scale: 192 px unit cells render about 0.75 tile tall (48 px). */
const SPRITE_SCALE = 0.25
/** Height of the overhead health bar above the unit in render pixels. */
const HP_BAR_OFFSET_Y = -28

export const FACTION_BY_OWNER: readonly ('blue' | 'red' | 'purple' | 'yellow')[] = ['blue', 'red', 'purple', 'yellow']

/**
 * Attack-animation subtype per kind: the curated pack names them differently
 * (warrior_attack, archer_shoot); pawns only have idle/run/interact, so the
 * attack state falls back to idle for them.
 */
const ATTACK_SUBTYPE: Record<UnitKind, string> = { pawn: 'interact', warrior: 'attack', archer: 'shoot' }

export interface UnitFrames {
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
  /** Horizontal facing: 1 = right, -1 = left. Only updated while moving so
   * idle keeps looking the way the unit last walked. */
  private facing = 1
  /** Wall-clock timestamp until which the attack animation is shown. */
  private attackUntil = 0

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
      this.frames = {
        idle: cloneAnimation(frames.idle),
        run: cloneAnimation(frames.run),
        attack: frames.attack === null ? null : cloneAnimation(frames.attack)
      }
      this.frames.idle.visible = false
      this.frames.run.visible = false
      if (this.frames.attack !== null) {
        this.frames.attack.visible = false
      }
      // All bodies must be in the display list so `setState` can reveal any.
      this.container.addChild(this.frames.idle)
      this.container.addChild(this.frames.run)
      if (this.frames.attack !== null) {
        this.container.addChild(this.frames.attack)
      }
      this.body = this.frames.idle
      this.fallback = null
    } else {
      this.frames = null
      this.fallback = new Graphics()
      this.fallback.circle(0, 0, UNIT_RADIUS).fill(OWNER_COLORS[owner % OWNER_COLORS.length] ?? 0x000000)
      this.body = this.fallback
      this.container.addChild(this.fallback)
    }
    this.hpBar = new Graphics()
    this.hpBar.visible = false
    this.hpBar.eventMode = 'none'
    this.container.addChild(this.hpBar)
  }

  /** Upgrades a placeholder sprite to animated frames once art loads. */
  swapFrames(template: UnitFrames): void {
    if (this.frames !== null) {
      return
    }
    this.frames = {
      idle: cloneAnimation(template.idle),
      run: cloneAnimation(template.run),
      attack: template.attack === null ? null : cloneAnimation(template.attack)
    }
    this.frames.idle.visible = false
    this.frames.run.visible = false
    if (this.frames.attack !== null) {
      this.frames.attack.visible = false
    }
    if (this.fallback !== null) {
      this.container.removeChild(this.fallback)
      this.fallback.destroy()
    }
    // All bodies must be in the display list so `setState` can reveal any.
    this.container.addChild(this.frames.idle)
    this.container.addChild(this.frames.run)
    if (this.frames.attack !== null) {
      this.container.addChild(this.frames.attack)
    }
    this.body = this.frames.idle
  }

  /** Shows idle, run, or attack by current state and flips by direction. */
  setState(moving: boolean, facingLeft: boolean, now: number): void {
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
    if (attacking) {
      next = this.frames.attack!
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

  /** Starts the attack animation for `until` (wall clock, presentation only). */
  beginAttack(until: number): void {
    this.attackUntil = until
  }

  /** Updates the overhead health bar; hidden when full or health is unknown. */
  setHealth(current: number | undefined, max: number | undefined): void {
    if (current === undefined || max === undefined || max <= 0) {
      if (this.hpBar.visible) {
        this.hpBar.visible = false
      }
      return
    }
    const ratio = hpRatio(current, max)
    if (current >= max) {
      this.hpBar.visible = false
      return
    }
    this.hpBar.visible = true
    const fill = hpFillWidth(ratio, HP_BAR_WIDTH)
    this.hpBar.clear()
    this.hpBar.rect(-HP_BAR_WIDTH / 2, HP_BAR_OFFSET_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT)
    this.hpBar.fill({ color: 0x000000, alpha: 0.5 })
    this.hpBar.rect(-HP_BAR_WIDTH / 2, HP_BAR_OFFSET_Y, fill, HP_BAR_HEIGHT)
    this.hpBar.fill({ color: hpColor(ratio) })
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

  /** Which animation is currently shown: `run`, `idle`, `attack`, or `fallback`. */
  stateName(): 'idle' | 'run' | 'attack' | 'fallback' {
    if (this.frames === null) {
      return 'fallback'
    }
    if (this.body === this.frames.run) {
      return 'run'
    }
    if (this.body === this.frames.attack) {
      return 'attack'
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

  /** Advances the visible animated body (no-op for placeholder graphics). */
  advanceAnimation(ticker: Ticker): void {
    if (this.body instanceof AnimatedSprite) {
      this.body.update(ticker)
    }
  }
}
