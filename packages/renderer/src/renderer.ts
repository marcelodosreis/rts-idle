import { Application, Graphics } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { CommandPing } from './ping.js'
import { SelectionController } from './selection.js'
import type { GameRenderer, RendererCallbacks, RendererOptions, RenderFrame } from './types.js'
import { UnitLayer } from './unit-layer.js'

const MIN_ZOOM = 0.05
const MAX_ZOOM = 4

/**
 * PixiJS renderer orchestrator. Owns the Application and the viewport, and
 * delegates presentation to three cohesive sub-components: the unit sprite
 * layer, the selection controller, and the command ping. The visual loop is
 * driven externally via `present` (never by the simulation).
 */
export class PixiRenderer implements GameRenderer {
  private app: Application | null = null
  private viewport: Viewport | null = null
  private units: UnitLayer | null = null
  private selection: SelectionController | null = null
  private ping: CommandPing | null = null
  private readonly options: RendererOptions
  private callbacks: RendererCallbacks = {}

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

    const units = new UnitLayer(viewport, (id) => {
      this.callbacks.onUnitSelected?.(id)
    })
    const selection = new SelectionController({
      viewport,
      units,
      selectionRect,
      onBoxSelected: (ids) => {
        this.callbacks.onBoxSelected?.(ids)
      }
    })
    const ping = new CommandPing(viewport)

    viewport.eventMode = 'static'
    viewport.on('pointerdown', (event) => {
      selection.startBox(event.global)
    })
    viewport.on('pointermove', (event) => {
      selection.updateBox(event.global)
    })
    viewport.on('pointerup', (event) => {
      selection.endBox(event.global)
    })
    viewport.on('rightdown', (event) => {
      const world = viewport.toWorld(event.global.x, event.global.y)
      ping.show(world.x, world.y)
      this.callbacks.onGroundCommand?.(world.x, world.y)
    })

    this.app = app
    this.viewport = viewport
    this.units = units
    this.selection = selection
    this.ping = ping
  }

  present(frame: RenderFrame): void {
    if (this.viewport === null || this.units === null || this.selection === null || this.ping === null) {
      throw new Error('PixiRenderer: not mounted')
    }
    this.units.present(frame.units)
    this.selection.updateRings()
    this.ping.expireIfElapsed(Date.now())
  }

  setSelection(ids: readonly number[]): void {
    this.selection?.set(ids)
  }

  getSelection(): readonly number[] {
    return this.selection?.get() ?? []
  }

  getPing(): { readonly x: number; readonly y: number } | null {
    return this.ping?.position() ?? null
  }

  moveCamera(x: number, y: number): void {
    this.viewport?.moveCenter(x, y)
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
    this.units = null
    this.selection = null
    this.ping = null
  }

  getUnitPositions(): ReadonlyMap<number, { readonly x: number; readonly y: number }> {
    return this.units?.positions() ?? new Map()
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
}
