import { Application, Graphics, type Ticker } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { AssetLibrary } from './assets/asset-library.js'
import { EffectsLayer } from './effects-layer.js'
import { CommandPing } from './ping.js'
import { SelectionController } from './selection.js'
import { TerrainLayer } from './terrain-layer.js'
import type { GameRenderer, RenderBuildPreview, RendererCallbacks, RendererOptions, RenderFrame } from './types.js'
import { UnitLayer } from './unit-layer.js'
import { WorldObjectLayer } from './world-object-layer.js'

const MIN_ZOOM = 0.05
const MAX_ZOOM = 4
/** Canvas background is always the water color so no beige ever shows. */
const WATER_BG = 0x47aba9

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
  private effects: EffectsLayer | null = null
  private terrain: TerrainLayer | null = null
  private worldObjects: WorldObjectLayer | null = null
  private readonly options: RendererOptions
  private callbacks: RendererCallbacks = {}
  /** Presentation asset library; null when the manifest/art is unavailable. */
  readonly assets: AssetLibrary

  constructor(options: RendererOptions) {
    this.options = options
    this.assets = new AssetLibrary(options.assetsUrl ?? '')
  }

  async mount(host: HTMLElement, callbacks: RendererCallbacks): Promise<void> {
    if (this.app !== null) {
      throw new Error('PixiRenderer: already mounted')
    }
    this.callbacks = callbacks
    await this.assets.load()

    const app = new Application()
    await app.init({
      resizeTo: host,
      background: WATER_BG,
      antialias: true,
      preference: 'webgl'
    })

    host.appendChild(app.canvas)
    app.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      if (this.viewport === null || this.units === null || this.worldObjects === null || this.ping === null) {
        return
      }
      const rect = app.canvas.getBoundingClientRect()
      const globalX = event.clientX - rect.left
      const globalY = event.clientY - rect.top
      this.dispatchCommand(globalX, globalY)
    })

    const viewport = new Viewport({
      screenWidth: app.screen.width,
      screenHeight: app.screen.height,
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

    app.ticker.add((ticker) => this.tick(ticker))

    const selectionRect = new Graphics()
    selectionRect.visible = false
    selectionRect.eventMode = 'none'
    app.stage.addChild(selectionRect)

    const units = new UnitLayer(viewport, this.assets, (id) => {
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
    const effects = new EffectsLayer(viewport)
    const worldObjects = new WorldObjectLayer(viewport)
    const terrain = new TerrainLayer(viewport, this.assets)
    if (this.options.map !== undefined) {
      await terrain.build(this.options.map)
    }

    viewport.eventMode = 'static'
    viewport.on('pointerdown', (event) => {
      // Only a primary click starts a selection box. Right-click and
      // Control+click are secondary input, routed through the canvas
      // `contextmenu` listener instead.
      if (event.button === 0 && !event.ctrlKey && !event.metaKey) {
        const world = viewport.toWorld(event.global.x, event.global.y)
        if (this.callbacks.onGroundClick?.(world.x, world.y) === true) {
          return
        }
        selection.startBox(event.global)
      }
    })
    viewport.on('pointermove', (event) => {
      const world = viewport.toWorld(event.global.x, event.global.y)
      this.callbacks.onGroundMove?.(world.x, world.y)
      selection.updateBox(event.global)
    })
    viewport.on('pointerup', (event) => {
      selection.endBox(event.global)
    })

    this.app = app
    this.viewport = viewport
    this.units = units
    this.selection = selection
    this.ping = ping
    this.effects = effects
    this.terrain = terrain
    this.worldObjects = worldObjects
  }

  present(frame: RenderFrame): void {
    if (
      this.viewport === null ||
      this.units === null ||
      this.selection === null ||
      this.ping === null ||
      this.effects === null ||
      this.worldObjects === null
    ) {
      throw new Error('PixiRenderer: not mounted')
    }
    const now = performance.now()
    this.worldObjects.present(frame.bases ?? [], frame.mineralNodes ?? [], frame.constructions ?? [])
    this.worldObjects.setActiveMineralNodes(
      new Set(frame.units.flatMap((unit) => (unit.economy === undefined ? [] : [unit.economy.nodeId])))
    )
    this.units.present(frame.units, now)
    this.selection.updateRings()
    this.ping.expireIfElapsed(Date.now())
    for (const event of frame.events ?? []) {
      if (event.type === 'attackFired') {
        this.units.beginAttack(event.attackerId, now)
        const target = frame.units.find((unit) => unit.id === event.targetId)
        if (target !== undefined) {
          this.units.faceToward(event.attackerId, target.x)
        }
      }
    }
    for (const unit of frame.units) {
      this.effects.trackPosition(unit.id, unit.x, unit.y)
    }
    this.effects.handleEvents(frame.events ?? [], now)
  }

  /**
   * Routes a right-click command (attack, gather, move) to the appropriate
   * callback based on what is under the cursor. Used by both the PixiJS
   * `rightdown` event (mouse) and the DOM `contextmenu` event (trackpad).
   */
  private dispatchCommand(globalX: number, globalY: number): void {
    if (this.viewport === null || this.units === null || this.worldObjects === null || this.ping === null) {
      return
    }
    const world = this.viewport.toWorld(globalX, globalY)
    const mineralNode = this.worldObjects.mineralNodeAt(world.x, world.y)
    if (mineralNode !== null) {
      this.ping.show(world.x, world.y)
      this.callbacks.onMineralCommand?.(mineralNode)
      return
    }
    const hit = this.units.unitAt(world.x, world.y)
    if (hit !== null) {
      this.callbacks.onUnitCommand?.(hit)
    } else {
      this.ping.show(world.x, world.y)
      this.callbacks.onGroundCommand?.(world.x, world.y)
    }
  }

  /** Visual-loop tick: advances animations and eases interpolated positions. */
  private tick(ticker: Ticker): void {
    if (this.units === null || this.selection === null || this.ping === null || this.effects === null) {
      return
    }
    const now = performance.now()
    this.units.advanceAnimations(ticker)
    this.units.interpolate(now)
    this.selection.updateRings()
    this.ping.expireIfElapsed(now)
    this.effects.tick(now)
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
    this.assets.destroy()
    this.terrain?.dispose()
    this.viewport = null
    this.units = null
    this.selection = null
    this.ping = null
    this.effects = null
    this.terrain = null
    this.worldObjects = null
  }

  getUnitPositions(): ReadonlyMap<number, { readonly x: number; readonly y: number }> {
    return this.units?.fixedPositions() ?? new Map()
  }

  getUnitAnimationFrame(id: number): number | null {
    return this.units?.animationFrame(id) ?? null
  }

  /** Last reported health of a unit (drives the overhead HP bar), or `null`. */
  getUnitHealth(id: number): { readonly current: number; readonly max: number } | null {
    return this.units?.health(id) ?? null
  }

  /** Debug: whether the unit's sprite body is visible and its current frame. */
  getUnitSpriteState(id: number): {
    readonly visible: boolean
    readonly frame: number | null
    readonly anim: 'idle' | 'run' | 'attack' | 'gather' | 'carry_idle' | 'carry_run' | 'fallback'
    readonly inTree: boolean
    readonly facing: number
    readonly scale: number
    readonly glyph: string | null
    readonly shape: 'circle' | 'square' | 'triangle' | null
  } | null {
    return this.units?.spriteState(id) ?? null
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

  setBuildPreview(preview: RenderBuildPreview | null): void {
    this.worldObjects?.setBuildPreview(preview)
  }
}
