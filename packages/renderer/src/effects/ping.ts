import type { Container } from 'pixi.js'
import { Graphics } from 'pixi.js'
import { SELECTION_COLOR } from './colors.js'

const PING_LIFETIME_MS = 800

/**
 * Right-click command ping: a brief world-space marker at the ground-command
 * target. Wall-clock expiry is presentation-only and never affects simulation.
 */
export class CommandPing {
  private readonly graphics: Graphics
  private pingUntil: number | null = 0
  private persistent = false

  constructor(interactionLayer: Container) {
    this.graphics = new Graphics()
    this.graphics.visible = false
    this.graphics.eventMode = 'none'
    interactionLayer.addChild(this.graphics)
  }

  show(worldX: number, worldY: number, color = SELECTION_COLOR): void {
    this.persistent = false
    this.draw(worldX, worldY, color, Date.now() + PING_LIFETIME_MS)
  }

  showPersistent(worldX: number, worldY: number, color: number): void {
    this.persistent = true
    this.draw(worldX, worldY, color, null)
  }

  private draw(worldX: number, worldY: number, color: number, pingUntil: number | null): void {
    this.graphics.clear()
    this.graphics.circle(0, 0, 14).stroke({ color, width: 2 })
    this.graphics.circle(0, 0, 4).fill(color)
    this.graphics.position.set(worldX, worldY)
    this.graphics.visible = true
    this.pingUntil = pingUntil
  }

  hide(): void {
    this.persistent = false
    this.graphics.visible = false
  }

  hidePersistent(): void {
    if (this.persistent) {
      this.hide()
    }
  }

  /** Hides the ping once its lifetime has elapsed. */
  expireIfElapsed(now: number): void {
    if (this.graphics.visible && this.pingUntil !== null && now > this.pingUntil) {
      this.graphics.visible = false
    }
  }

  position(): { readonly x: number; readonly y: number } | null {
    if (!this.graphics.visible) {
      return null
    }
    return { x: this.graphics.position.x, y: this.graphics.position.y }
  }
}
