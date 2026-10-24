import { fixedToRenderPixels } from '@rts/shared'
import { type Container, Graphics } from 'pixi.js'
import type { AssetLibrary } from '../assets/asset-library.js'
import { interpolationAlpha, lerpPoint } from '../core/interpolation.js'
import type { RenderProjectile } from '../core/types.js'
import { factionForOwner } from '../units/economy-animation.js'

interface Point {
  readonly x: number
  readonly y: number
}

interface ProjectileVisual {
  readonly id: number
  display: Container
  fallback: boolean
}

export interface ProjectilePresentationState {
  readonly id: number
  readonly x: number
  readonly y: number
  readonly rotation: number
  readonly fallback: boolean
  readonly inTree: boolean
}

function fallbackProjectile(owner: number): Graphics {
  const graphics = new Graphics()
  const color = owner % 2 === 0 ? 0xf4d35e : 0xff8a65
  graphics.moveTo(-7, 0).lineTo(7, 0).stroke({ color, width: 3, alpha: 0.95 })
  graphics.moveTo(2, -4).lineTo(7, 0).lineTo(2, 4).stroke({ color, width: 2, alpha: 0.95 })
  graphics.circle(0, 0, 2).fill({ color, alpha: 1 })
  graphics.eventMode = 'none'
  return graphics
}

export function projectileRotation(from: Point | undefined, to: Point): number | undefined {
  if (from === undefined || (from.x === to.x && from.y === to.y)) {
    return undefined
  }
  return Math.atan2(to.y - from.y, to.x - from.x)
}

function assetKey(projectile: RenderProjectile): string {
  return `units.${factionForOwner(projectile.owner)}.archer.arrow`
}

export class ProjectileLayer {
  private readonly visuals = new Map<number, ProjectileVisual>()
  private readonly layer: Container
  private readonly library: AssetLibrary
  private previous: ReadonlyMap<number, Point> | null = null
  private current: ReadonlyMap<number, Point> | null = null
  private previousTime = 0
  private currentTime = 0
  private disposed = false

  constructor(layer: Container, library: AssetLibrary) {
    this.layer = layer
    this.library = library
  }

  present(projectiles: readonly RenderProjectile[], now: number): void {
    if (this.disposed) {
      return
    }
    const seen = new Set<number>()
    const next = new Map<number, Point>()
    const previous = this.current
    for (const projectile of projectiles) {
      seen.add(projectile.id)
      const point = { x: fixedToRenderPixels(projectile.x), y: fixedToRenderPixels(projectile.y) }
      next.set(projectile.id, point)
      this.ensureVisual(projectile)
      this.setPosition(projectile.id, point, projectileRotation(previous?.get(projectile.id), point))
    }
    for (const [id, visual] of this.visuals) {
      if (!seen.has(id)) {
        this.layer.removeChild(visual.display)
        visual.display.destroy()
        this.visuals.delete(id)
      }
    }
    this.previous = this.current
    this.previousTime = this.currentTime
    this.current = next
    this.currentTime = now
    if (this.previous === null) {
      this.interpolate(now)
    }
  }

  interpolate(now: number): void {
    if (this.current === null || this.previous === null) {
      return
    }
    const alpha = interpolationAlpha(now, this.currentTime, this.previousTime)
    for (const [id, target] of this.current) {
      const from = this.previous.get(id)
      this.setPosition(id, from === undefined ? target : lerpPoint(from, target, alpha))
    }
  }

  presentationState(id: number): ProjectilePresentationState | null {
    const visual = this.visuals.get(id)
    if (visual === undefined) {
      return null
    }
    return {
      id,
      x: visual.display.position.x,
      y: visual.display.position.y,
      rotation: visual.display.rotation,
      fallback: visual.fallback,
      inTree: visual.display.parent === this.layer
    }
  }

  dispose(): void {
    if (this.disposed) {
      return
    }
    this.disposed = true
    for (const visual of this.visuals.values()) {
      visual.display.removeFromParent()
      visual.display.destroy()
    }
    this.visuals.clear()
    this.previous = null
    this.current = null
  }

  private ensureVisual(projectile: RenderProjectile): void {
    if (this.visuals.has(projectile.id)) {
      return
    }
    const visual: ProjectileVisual = {
      id: projectile.id,
      display: fallbackProjectile(projectile.owner),
      fallback: true
    }
    this.visuals.set(projectile.id, visual)
    this.layer.addChild(visual.display)
    void this.library.staticSprite(assetKey(projectile)).then((sprite) => {
      if (sprite === null || this.disposed || this.visuals.get(projectile.id) !== visual) {
        sprite?.destroy()
        return
      }
      const position = { x: visual.display.position.x, y: visual.display.position.y }
      const rotation = visual.display.rotation
      this.layer.removeChild(visual.display)
      visual.display.destroy()
      sprite.position.set(position.x, position.y)
      sprite.rotation = rotation
      sprite.eventMode = 'none'
      sprite.scale.set(0.5)
      visual.fallback = false
      visual.display = sprite
      this.layer.addChild(sprite)
    })
  }

  private setPosition(id: number, point: Point, rotation?: number): void {
    const display = this.visuals.get(id)?.display
    if (display === undefined) {
      return
    }
    display.position.set(point.x, point.y)
    if (rotation !== undefined) {
      display.rotation = rotation
    }
  }
}
