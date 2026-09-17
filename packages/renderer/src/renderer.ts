import { Application, Graphics, type PointData } from 'pixi.js'
import { Viewport } from 'pixi-viewport'

export interface RenderUnit {
  readonly id: number
  readonly x: number
  readonly y: number
  readonly owner: number
}

export interface RenderFrame {
  readonly tick: number
  readonly units: readonly RenderUnit[]
}

export interface RendererCallbacks {
  readonly onUnitSelected?: (id: number) => void
  readonly onBoxSelected?: (ids: readonly number[]) => void
  readonly onGroundCommand?: (worldX: number, worldY: number) => void
}

export interface RendererOptions {
  readonly worldWidth: number
  readonly worldHeight: number
  readonly initialZoom?: number
  readonly initialCenter?: PointData
}

export interface GameRenderer {
  mount(host: HTMLElement, callbacks: RendererCallbacks): Promise<void>
  present(frame: RenderFrame): void
  resize(width: number, height: number): void
  dispose(): void
  setSelection(ids: readonly number[]): void
  getSelection(): readonly number[]
  getUnitPositions(): ReadonlyMap<number, { readonly x: number; readonly y: number }>
  getZoom(): number
  getPing(): { readonly x: number; readonly y: number } | null
  moveCamera(x: number, y: number): void
  worldToScreen(x: number, y: number): { readonly x: number; readonly y: number }
}

const OWNER_COLORS = [0x2e7d32, 0xc62828, 0x1565c0, 0xf9a825]
const UNIT_RADIUS = 8
const SELECTION_COLOR = 0xfbc02d
const PING_COLOR = 0xffffff
const PING_LIFETIME_MS = 800
const MIN_ZOOM = 0.05
const MAX_ZOOM = 4

class UnitSprite {
  readonly graphics: Graphics

  constructor(id: number, owner: number) {
    this.graphics = new Graphics()
    this.graphics.circle(0, 0, UNIT_RADIUS).fill(OWNER_COLORS[owner % OWNER_COLORS.length] ?? 0x000000)
    this.graphics.eventMode = 'static'
    this.graphics.cursor = 'pointer'
    this.graphics.label = `unit-${id}`
  }

  setPosition(x: number, y: number): void {
    this.graphics.position.set(x, y)
  }
}

export class PixiRenderer implements GameRenderer {
  private app: Application | null = null
  private viewport: Viewport | null = null
  private readonly units = new Map<number, UnitSprite>()
  private readonly options: RendererOptions
  private callbacks: RendererCallbacks = {}
  private selecting = false
  private selectionStart: PointData | null = null
  private selectionRect: Graphics | null = null
  private readonly selection = new Set<number>()
  private readonly selectionRings = new Map<number, Graphics>()
  private ping: Graphics | null = null
  private pingUntil = 0

  constructor(options: RendererOptions) {
    this.options = options
  }

  async mount(host: HTMLElement, callbacks: RendererCallbacks): Promise<void> {
    if (this.app !== null) {
      throw new Error('PixiRenderer: already mounted')
    }
    this.callbacks = callbacks

    const app = new Application()
    await app.init({
      resizeTo: host,
      background: 0xf4efe4,
      antialias: true,
      preference: 'webgl'
    })

    host.appendChild(app.canvas)
    app.canvas.addEventListener('contextmenu', (event) => event.preventDefault())

    const viewport = new Viewport({
      screenWidth: host.clientWidth || 800,
      screenHeight: host.clientHeight || 600,
      worldWidth: this.options.worldWidth,
      worldHeight: this.options.worldHeight,
      events: app.renderer.events
    })
    app.stage.addChild(viewport)
    viewport.drag({ mouseButtons: 'middle' }).wheel().clampZoom({ minScale: MIN_ZOOM, maxScale: MAX_ZOOM })

    const zoom = this.options.initialZoom ?? 1
    const center = this.options.initialCenter ?? {
      x: this.options.worldWidth / 2,
      y: this.options.worldHeight / 2
    }
    viewport.setZoom(zoom)
    viewport.moveCenter(center.x, center.y)

    const selectionRect = new Graphics()
    selectionRect.visible = false
    selectionRect.eventMode = 'none'
    app.stage.addChild(selectionRect)

    viewport.eventMode = 'static'
    viewport.on('pointerdown', (event) => {
      this.startBoxSelection(event.global)
    })
    viewport.on('pointermove', (event) => {
      this.updateBoxSelection(event.global)
    })
    viewport.on('pointerup', (event) => {
      this.endBoxSelection(event.global)
    })
    viewport.on('rightdown', (event) => {
      const world = viewport.toWorld(event.global.x, event.global.y)
      this.showPing(world.x, world.y)
      this.callbacks.onGroundCommand?.(world.x, world.y)
    })

    const ping = new Graphics()
    ping.visible = false
    ping.eventMode = 'none'
    viewport.addChild(ping)

    this.app = app
    this.viewport = viewport
    this.selectionRect = selectionRect
    this.ping = ping
  }

  present(frame: RenderFrame): void {
    if (this.viewport === null) {
      throw new Error('PixiRenderer: not mounted')
    }
    const seen = new Set<number>()
    for (const unit of frame.units) {
      seen.add(unit.id)
      let sprite = this.units.get(unit.id)
      if (sprite === undefined) {
        sprite = new UnitSprite(unit.id, unit.owner)
        sprite.graphics.on('pointerdown', (event) => {
          event.stopPropagation()
          this.callbacks.onUnitSelected?.(unit.id)
        })
        this.viewport.addChild(sprite.graphics)
        this.units.set(unit.id, sprite)
      }
      sprite.setPosition(unit.x, unit.y)
    }
    for (const [id, sprite] of [...this.units]) {
      if (!seen.has(id)) {
        this.viewport.removeChild(sprite.graphics)
        sprite.graphics.destroy()
        this.units.delete(id)
        this.removeSelectionRing(id)
      }
    }

    for (const id of this.selection) {
      const sprite = this.units.get(id)
      if (sprite !== undefined) {
        this.updateSelectionRing(id, sprite.graphics.position.x, sprite.graphics.position.y)
      }
    }

    if (this.ping?.visible === true && Date.now() > this.pingUntil) {
      this.ping.visible = false
    }
  }

  setSelection(ids: readonly number[]): void {
    const next = new Set(ids)
    for (const id of [...this.selection]) {
      if (!next.has(id)) {
        this.removeSelectionRing(id)
        this.selection.delete(id)
      }
    }
    for (const id of next) {
      this.selection.add(id)
      const sprite = this.units.get(id)
      if (sprite !== undefined) {
        this.updateSelectionRing(id, sprite.graphics.position.x, sprite.graphics.position.y)
      }
    }
  }

  getSelection(): readonly number[] {
    return [...this.selection]
  }

  getPing(): { readonly x: number; readonly y: number } | null {
    if (this.ping === null || !this.ping.visible) {
      return null
    }
    return { x: this.ping.position.x, y: this.ping.position.y }
  }

  moveCamera(x: number, y: number): void {
    if (this.viewport === null) {
      return
    }
    this.viewport.moveCenter(x, y)
  }

  private showPing(worldX: number, worldY: number): void {
    if (this.ping === null) {
      return
    }
    this.ping.clear()
    this.ping.circle(0, 0, 14).stroke({ color: PING_COLOR, width: 2 })
    this.ping.circle(0, 0, 4).fill(PING_COLOR)
    this.ping.position.set(worldX, worldY)
    this.ping.visible = true
    this.pingUntil = Date.now() + PING_LIFETIME_MS
  }

  private updateSelectionRing(id: number, x: number, y: number): void {
    if (this.viewport === null) {
      return
    }
    let ring = this.selectionRings.get(id)
    if (ring === undefined) {
      ring = new Graphics()
      ring.circle(0, 0, UNIT_RADIUS + 4).stroke({ color: SELECTION_COLOR, width: 2 })
      ring.eventMode = 'none'
      this.viewport.addChild(ring)
      this.selectionRings.set(id, ring)
    }
    ring.position.set(x, y)
  }

  private removeSelectionRing(id: number): void {
    const ring = this.selectionRings.get(id)
    if (ring === undefined) {
      return
    }
    if (this.viewport !== null) {
      this.viewport.removeChild(ring)
    }
    ring.destroy()
    this.selectionRings.delete(id)
  }

  resize(width: number, height: number): void {
    if (this.viewport === null || this.app === null) {
      return
    }
    this.viewport.resize(width, height)
    this.app.renderer.resize(width, height)
  }

  dispose(): void {
    if (this.app !== null) {
      this.app.destroy(true, { children: true, texture: true })
      this.app = null
    }
    this.viewport = null
    this.selectionRect = null
    this.ping = null
    this.units.clear()
    this.selection.clear()
    this.selectionRings.clear()
  }

  getUnitPositions(): ReadonlyMap<number, { readonly x: number; readonly y: number }> {
    const out = new Map<number, { readonly x: number; readonly y: number }>()
    for (const [id, sprite] of this.units) {
      out.set(id, { x: sprite.graphics.position.x, y: sprite.graphics.position.y })
    }
    return out
  }

  getZoom(): number {
    if (this.viewport === null) {
      return 0
    }
    return this.viewport.scale.x
  }

  worldToScreen(x: number, y: number): { readonly x: number; readonly y: number } {
    if (this.viewport === null) {
      return { x, y }
    }
    return this.viewport.toScreen(x, y)
  }

  private startBoxSelection(screen: PointData): void {
    this.selecting = true
    this.selectionStart = { x: screen.x, y: screen.y }
    if (this.selectionRect !== null) {
      this.selectionRect.visible = true
      this.selectionRect.clear()
      this.selectionRect.rect(screen.x, screen.y, 0, 0).fill(0x1565c0, 0.15)
      this.selectionRect.stroke({ width: 1, color: 0x1565c0 })
    }
  }

  private updateBoxSelection(screen: PointData): void {
    if (!this.selecting || this.selectionStart === null || this.selectionRect === null) {
      return
    }
    const x = Math.min(this.selectionStart.x, screen.x)
    const y = Math.min(this.selectionStart.y, screen.y)
    const width = Math.abs(screen.x - this.selectionStart.x)
    const height = Math.abs(screen.y - this.selectionStart.y)
    this.selectionRect.clear()
    this.selectionRect.rect(x, y, width, height).fill(0x1565c0, 0.15)
    this.selectionRect.stroke({ width: 1, color: 0x1565c0 })
  }

  private endBoxSelection(screen: PointData): void {
    if (!this.selecting || this.selectionStart === null || this.viewport === null) {
      return
    }
    this.selecting = false
    if (this.selectionRect !== null) {
      this.selectionRect.visible = false
      this.selectionRect.clear()
    }

    const x0 = Math.min(this.selectionStart.x, screen.x)
    const y0 = Math.min(this.selectionStart.y, screen.y)
    const x1 = Math.max(this.selectionStart.x, screen.x)
    const y1 = Math.max(this.selectionStart.y, screen.y)

    const topLeft = this.viewport.toWorld(x0, y0)
    const bottomRight = this.viewport.toWorld(x1, y1)

    const selected: number[] = []
    for (const [id, sprite] of this.units) {
      const p = sprite.graphics.position
      if (p.x >= topLeft.x && p.x <= bottomRight.x && p.y >= topLeft.y && p.y <= bottomRight.y) {
        selected.push(id)
      }
    }
    if (selected.length > 0) {
      this.callbacks.onBoxSelected?.(selected)
    } else {
      this.callbacks.onBoxSelected?.([])
    }
  }
}
