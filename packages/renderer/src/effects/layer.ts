import { fixedToRenderPixels, type SimulationEvent } from '@rts/shared'
import { Container, Graphics, Text } from 'pixi.js'

const STREAK_LIFETIME_MS = 120
const STREAK_COLOR = 0xffd54f
const POPUP_LIFETIME_MS = 700
const POPUP_RISE_PX = 26
const EXPLOSION_LIFETIME_MS = 450
const EXPLOSION_COLOR = 0xff7043

interface Point {
  readonly x: number
  readonly y: number
}

interface ActiveEffect {
  readonly display: Container
  readonly expiresAt: number
  update(now: number): void
}

function toRenderPixels(point: Point): Point {
  return { x: fixedToRenderPixels(point.x), y: fixedToRenderPixels(point.y) }
}

/**
 * Combat feedback effects (master plan §23.2, V9): attack streaks, floating
 * damage numbers, and death explosions. Everything is wall-clock driven and
 * presentation-only — never deterministic, never fed back into the simulation.
 */
export class EffectsLayer {
  private readonly effectsLayer: Container
  private readonly active: ActiveEffect[] = []
  private readonly positions = new Map<number, Point>()

  constructor(effectsLayer: Container) {
    this.effectsLayer = effectsLayer
  }

  /** Records the frame's unit positions and spawns effects for its events. */
  handleEvents(events: readonly SimulationEvent[], now: number): void {
    for (const event of events) {
      switch (event.type) {
        case 'attackFired':
          this.spawnStreak(event.attackerId, event.targetId, now)
          break
        case 'damageDealt':
          this.spawnPopup(event.targetId, event.amount, now)
          break
        case 'unitDied':
          this.spawnExplosion(event.entityId, now)
          break
      }
    }
  }

  /** Stores a unit's latest fixed position for effect placement (survives death). */
  trackPosition(id: number, x: number, y: number): void {
    this.positions.set(id, { x, y })
  }

  /** Advances and expires effects; called from the visual loop. */
  tick(now: number): void {
    for (const effect of this.active) {
      effect.update(now)
    }
    let index = 0
    while (index < this.active.length) {
      const effect = this.active[index]!
      if (now > effect.expiresAt) {
        this.active.splice(index, 1)
        this.effectsLayer.removeChild(effect.display)
        effect.display.destroy()
      } else {
        index += 1
      }
    }
  }

  private spawnStreak(attackerId: number, targetId: number, now: number): void {
    const from = this.positions.get(attackerId)
    const to = this.positions.get(targetId)
    if (from === undefined || to === undefined) {
      return
    }
    const a = toRenderPixels(from)
    const b = toRenderPixels(to)
    const graphics = new Graphics()
    graphics.moveTo(a.x, a.y).lineTo(b.x, b.y)
    graphics.stroke({ color: STREAK_COLOR, width: 2, alpha: 1 })
    graphics.eventMode = 'none'
    this.effectsLayer.addChild(graphics)
    this.active.push({
      display: graphics,
      expiresAt: now + STREAK_LIFETIME_MS,
      update: (current) => {
        graphics.alpha = 1 - (current - now) / STREAK_LIFETIME_MS
      }
    })
  }

  private spawnPopup(targetId: number, amount: number, now: number): void {
    const point = this.positions.get(targetId)
    if (point === undefined) {
      return
    }
    const position = toRenderPixels(point)
    const label = new Text({
      text: `-${amount}`,
      style: { fontSize: 14, fill: 0xffffff, stroke: { color: 0x000000, width: 3 } }
    })
    label.anchor.set(0.5, 0.5)
    label.position.set(position.x, position.y - 14)
    label.eventMode = 'none'
    const container = new Container()
    container.addChild(label)
    this.effectsLayer.addChild(container)
    this.active.push({
      display: container,
      expiresAt: now + POPUP_LIFETIME_MS,
      update: (current) => {
        const progress = (current - now) / POPUP_LIFETIME_MS
        label.y = position.y - 14 - POPUP_RISE_PX * progress
        label.alpha = 1 - progress
      }
    })
  }

  private spawnExplosion(entityId: number, now: number): void {
    const point = this.positions.get(entityId)
    if (point === undefined) {
      return
    }
    const position = toRenderPixels(point)
    const graphics = new Graphics()
    graphics.eventMode = 'none'
    this.effectsLayer.addChild(graphics)
    const radius = 18
    this.active.push({
      display: graphics,
      expiresAt: now + EXPLOSION_LIFETIME_MS,
      update: (current) => {
        const progress = (current - now) / EXPLOSION_LIFETIME_MS
        graphics.clear()
        graphics.circle(0, 0, radius * (1 + progress * 1.5))
        graphics.stroke({ color: EXPLOSION_COLOR, width: 3, alpha: 1 - progress })
        graphics.circle(0, 0, radius * (0.4 + progress * 0.6))
        graphics.fill({ color: EXPLOSION_COLOR, alpha: 1 - progress })
        graphics.position.set(position.x, position.y)
      }
    })
  }
}
