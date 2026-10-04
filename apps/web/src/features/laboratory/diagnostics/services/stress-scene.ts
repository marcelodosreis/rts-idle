import { createCameraController } from '@rts/renderer'
import { AnimatedSprite, Container, type Texture } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import { createSectionApp, disposeSectionApp, trackTexture } from '../../shared/services/section-app'
import type { SectionContext } from '../../shared/types/section-context'

const VIEW_H = 340
const MIN_ZOOM = 0.05
const MAX_ZOOM = 8

type AppHandle = Awaited<ReturnType<typeof createSectionApp>>

/** Owns the Pixi stress scene: camera, sprite pool, and spawn/reset operations. */
export class StressScene {
  private sprites: AnimatedSprite[] = []
  private readonly framesByKey = new Map<string, Texture[]>()
  private readonly pool: readonly string[]
  private world: Container | null = null
  private tickHandler: (() => void) | null = null
  private spawnSeq = 0
  private disposed = false

  private constructor(
    private readonly app: AppHandle,
    private readonly viewport: Viewport,
    private readonly camera: ReturnType<typeof createCameraController>,
    private readonly ctx: SectionContext
  ) {
    this.pool = this.collectPool()
  }

  static async create(host: HTMLElement, ctx: SectionContext): Promise<StressScene> {
    let scene: StressScene | null = null
    const app = await createSectionApp(host, VIEW_H, (width, height) => scene?.resize(width, height))
    const camera = createCameraController(app, {
      initialCenter: { x: app.screen.width / 2, y: VIEW_H / 2 },
      initialZoom: 1,
      worldWidth: app.screen.width,
      worldHeight: app.screen.height,
      input: { profile: 'mouse', minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM }
    })
    scene = new StressScene(app, camera.viewport, camera, ctx)
    scene.world = new Container()
    camera.viewport.addChild(scene.world)
    scene.tickHandler = () => scene?.tick()
    app.ticker.add(scene.tickHandler)
    return scene
  }

  private collectPool(): readonly string[] {
    return this.ctx.assets
      .keys()
      .filter((key) => {
        if (!key.startsWith('units.')) {
          return false
        }
        const last = key.split('.').at(-1) ?? ''
        return last === 'idle' || last === 'run' || last.endsWith('_idle') || last.endsWith('_run')
      })
      .sort()
  }

  private cellFor(count: number): number {
    const fit = Math.floor(Math.sqrt((VIEW_H * this.app.screen.width) / count))
    return Math.max(2, Math.min(48, fit))
  }

  private async loadFrames(key: string): Promise<Texture[] | null> {
    const cached = this.framesByKey.get(key)
    if (cached !== undefined) {
      return cached
    }
    const frames = await this.ctx.assets.stripTextures(key)
    if (frames !== null && frames.length > 0) {
      for (const frame of frames) {
        trackTexture(frame)
      }
      this.framesByKey.set(key, frames)
    }
    return frames
  }

  private addSprite(key: string, frames: readonly Texture[], index: number, cell: number, perRow: number): void {
    if (this.world === null) {
      return
    }
    const sprite = new AnimatedSprite([...frames], false)
    const entry = this.ctx.assets.entry(key)
    sprite.animationSpeed = 1000 / (entry?.duration ?? 100) / 60
    sprite.scale.set(Math.min(0.4, cell / 96))
    sprite.position.set((index % perRow) * cell + cell / 2, Math.floor(index / perRow) * cell + cell / 2)
    sprite.play()
    this.world.addChild(sprite)
    this.sprites.push(sprite)
  }

  async spawn(count: number): Promise<void> {
    const seq = ++this.spawnSeq
    for (const sprite of this.sprites) {
      sprite.destroy()
    }
    this.sprites = []
    if (this.pool.length === 0 || this.world === null) {
      return
    }
    const cell = this.cellFor(count)
    const perRow = Math.max(1, Math.floor(this.app.screen.width / cell))
    for (let index = 0; index < count; index += 1) {
      const key = this.pool[Math.floor(Math.random() * this.pool.length)] ?? ''
      const frames = await this.loadFrames(key)
      if (seq !== this.spawnSeq || this.disposed || this.world === null) {
        return
      }
      if (frames !== null && frames.length > 0) {
        this.addSprite(key, frames, index, cell, perRow)
      }
    }
  }

  private tick(): void {
    for (const sprite of this.sprites) {
      sprite.update(this.app.ticker)
    }
  }

  resetCamera(): void {
    this.viewport.setZoom(1)
    this.viewport.moveCenter(this.app.screen.width / 2, VIEW_H / 2)
  }

  resize(width: number, height: number): void {
    this.viewport.resize(width, height)
  }

  pause(): void {
    this.app.ticker.stop()
  }

  resume(): void {
    this.app.ticker.start()
  }

  readout(): string {
    return (
      `${this.sprites.length} animated sprites (random units) · ${Math.round(this.app.ticker.FPS)} fps (target 60) · ` +
      `zoom ${this.viewport.scale.x.toFixed(2)} · middle-drag to pan, wheel to zoom`
    )
  }

  dispose(): void {
    this.disposed = true
    this.spawnSeq += 1
    this.world = null
    if (this.tickHandler !== null) {
      this.app.ticker.remove(this.tickHandler)
    }
    this.camera.dispose()
    for (const sprite of this.sprites) {
      sprite.destroy()
    }
    this.sprites = []
    disposeSectionApp(this.app)
    this.app.destroy()
  }
}
