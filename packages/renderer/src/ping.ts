import { Graphics } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'

const PING_COLOR = 0xffffff
const PING_LIFETIME_MS = 800

/**
 * Right-click command ping: a brief world-space marker at the ground-command
 * target. Wall-clock expiry is presentation-only and never affects simulation.
 */
export class CommandPing {
  private readonly graphics: Graphics
  private pingUntil = 0

  constructor(viewport: Viewport) {
    this.graphics = new Graphics()
    this.graphics.visible = false
    this.graphics.eventMode = 'none'
    viewport.addChild(this.graphics)
  }

  show(worldX: number, worldY: number): void {
    this.graphics.clear()
    this.graphics.circle(0, 0, 14).stroke({ color: PING_COLOR, width: 2 })
    this.graphics.circle(0, 0, 4).fill(PING_COLOR)
    this.graphics.position.set(worldX, worldY)
    this.graphics.visible = true
    this.pingUntil = Date.now() + PING_LIFETIME_MS
  }

  /** Hides the ping once its lifetime has elapsed. */
  expireIfElapsed(now: number): void {
    if (this.graphics.visible && now > this.pingUntil) {
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
