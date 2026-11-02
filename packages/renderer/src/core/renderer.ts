import { assertNever, type ResourceType, resourceTypeForKind } from '@rts/shared'
import { Application, type Ticker } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import { AssetLibrary } from '../assets/asset-library.js'
import { POINTER_COLOR, RALLY_COLOR, SELECTION_COLOR } from '../effects/colors.js'
import { EffectsLayer } from '../effects/layer.js'
import { CommandPing } from '../effects/ping.js'
import { SelectionController } from '../effects/selection.js'
import { createFogBackdrop, type FogBackdrop } from '../fog/backdrop.js'
import { FogLayer } from '../fog/layer.js'
import type { createCameraController } from '../input/camera-controller.js'
import type { WorldInteraction } from '../input/input-types.js'
import { createWorldHitTester } from '../input/world-hit-tester.js'
import { inputCanvasFrom, WorldInputAdapter } from '../input/world-input-adapter.js'
import { ProjectileLayer } from '../projectiles/layer.js'
import { createResourceFallbackTextures } from '../resources/resource-fallback.js'
import { ResourceLayer } from '../resources/resource-layer.js'
import { TerrainLayer } from '../terrain/layer.js'
import { WATER_BG } from '../terrain/palette.js'
import { UnitLayer } from '../units/layer.js'
import { WorldObjectLayer } from '../world/object-layer.js'
import { createRendererCamera } from './create-camera.js'
import { RenderLayers } from './render-layers.js'
import { EMPTY_RESOURCE_STATS } from './resource-stats.js'
import { createSelectionRect } from './selection-rect.js'
import type {
  GameRenderer,
  RenderBuildPreview,
  RendererCallbacks,
  RendererOptions,
  RenderFrame,
  UnitSpriteState
} from './types.js'
import { disposeUnwiredLayers, type WiredLayers } from './wired-layers.js'

export class PixiRenderer implements GameRenderer {
  private app: Application | null = null
  private viewport: Viewport | null = null
  private units: UnitLayer | null = null
  private projectiles: ProjectileLayer | null = null
  private fog: FogLayer | null = null
  private selection: SelectionController | null = null
  private ping: CommandPing | null = null
  private selectedRallyProducerId: number | null = null
  private effects: EffectsLayer | null = null
  private terrain: TerrainLayer | null = null
  private worldObjects: WorldObjectLayer | null = null
  private resources: ResourceLayer | null = null
  private input: WorldInputAdapter | null = null
  private camera: ReturnType<typeof createCameraController> | null = null
  private backdrop: FogBackdrop | null = null
  private mountId = 0
  private readonly options: RendererOptions
  private callbacks!: RendererCallbacks
  readonly assets: AssetLibrary

  constructor(options: RendererOptions) {
    this.options = options
    this.assets = new AssetLibrary(options.assetsUrl ?? '')
  }
  private async createApplication(host: HTMLElement, mountId: number): Promise<Application | null> {
    const app = new Application()
    await app.init({ resizeTo: host, background: WATER_BG, roundPixels: true, preference: 'webgl' })
    if (mountId !== this.mountId) {
      this.destroyApplication(app, false)
      return null
    }
    host.appendChild(app.canvas)
    app.canvas.style.display = 'block'
    app.canvas.style.width = '100%'
    app.canvas.style.height = '100%'
    app.canvas.style.touchAction = 'none'
    app.canvas.style.overscrollBehavior = 'contain'
    return app
  }
  private async wire(app: Application, viewport: Viewport, mountId: number): Promise<WiredLayers | null> {
    const layers = new RenderLayers(viewport)
    app.ticker.add((ticker) => this.tick(ticker))
    const selectionRect = createSelectionRect(app)
    const unitResourceTypes = new Map<number, ResourceType>(
      (this.options.map?.resources ?? []).map((resource) => [resource.resourceId, resourceTypeForKind(resource.kind)])
    )
    const units = new UnitLayer(layers.units, this.assets, unitResourceTypes)
    const projectiles = new ProjectileLayer(layers.projectiles, this.assets)
    const fog = new FogLayer(layers.fog, this.options.map?.width, this.options.map?.height)
    const selection = new SelectionController({ selectionLayer: layers.selection, units, selectionRect })
    const ping = new CommandPing(layers.interaction)
    const effects = new EffectsLayer(layers.effects)
    const worldObjects = new WorldObjectLayer(layers.worldObjects, layers.interaction, this.assets)
    await worldObjects.loadAssets()
    const resources = new ResourceLayer(
      layers.worldObjects,
      this.options.map,
      createResourceFallbackTextures(app.renderer)
    )
    const terrain = new TerrainLayer(layers.terrain, this.assets)
    if (this.options.map !== undefined) {
      await terrain.build(this.options.map)
    }
    if (mountId !== this.mountId) {
      disposeUnwiredLayers(projectiles, terrain)
      this.destroyApplication(app, false)
      return null
    }
    const camera = this.camera as ReturnType<typeof createCameraController>
    const hitTester = createWorldHitTester({
      unitAt: (x, y) => units.unitAt(x, y),
      buildingAt: (x, y) => worldObjects.buildingAt(x, y),
      resourceAt: (x, y) => resources.resourceAt(x, y)
    })
    const input = new WorldInputAdapter({
      canvas: inputCanvasFrom(app.canvas),
      viewport,
      hitTester,
      onInteraction: (interaction) => this.handleInteraction(interaction, selection),
      dragThresholdPx: 6
    })
    return {
      viewport,
      units,
      projectiles,
      fog,
      selection,
      ping,
      effects,
      terrain,
      worldObjects,
      resources,
      input,
      camera
    }
  }
  async mount(host: HTMLElement, callbacks: RendererCallbacks): Promise<void> {
    if (this.app !== null) {
      throw new Error('PixiRenderer: already mounted')
    }
    const mountId = ++this.mountId
    this.callbacks = callbacks
    await this.assets.load()
    if (mountId !== this.mountId) {
      return
    }
    const app = await this.createApplication(host, mountId)
    if (app === null) {
      return
    }
    const camera = createRendererCamera(app, this.options)
    this.camera = camera
    this.backdrop = this.options.clampToWorld === true ? createFogBackdrop(app) : null
    const wired = await this.wire(app, camera.viewport, mountId)
    if (wired === null) {
      this.backdrop?.dispose()
      this.backdrop = null
      camera.dispose()
      this.camera = null
      return
    }
    this.app = app
    this.viewport = wired.viewport
    this.units = wired.units
    this.projectiles = wired.projectiles
    this.fog = wired.fog
    this.selection = wired.selection
    this.ping = wired.ping
    this.effects = wired.effects
    this.terrain = wired.terrain
    this.worldObjects = wired.worldObjects
    this.resources = wired.resources
    this.input = wired.input
    this.camera = wired.camera
  }
  private destroyApplication(app: Application, releaseGlobalResources: boolean): void {
    app.destroy({ removeView: true, releaseGlobalResources }, { children: true, texture: false, textureSource: false })
  }
  present(frame: RenderFrame): void {
    if (
      this.viewport === null ||
      this.units === null ||
      this.selection === null ||
      this.ping === null ||
      this.effects === null ||
      this.projectiles === null ||
      this.fog === null ||
      this.worldObjects === null ||
      this.resources === null
    ) {
      throw new Error('PixiRenderer: not mounted')
    }
    const now = performance.now()
    this.worldObjects.present(frame.buildings ?? [])
    this.resources.present(frame.resources ?? [], frame.resourcesComplete === true)
    this.units.present(frame.units, now)
    this.projectiles.present(frame.projectiles ?? [], now)
    this.fog.present(frame.fog)
    this.selection.updateRings()
    this.ping.expireIfElapsed(Date.now())
    for (const event of frame.events ?? []) {
      if (event.type === 'attackFired') {
        this.units.beginAttack(event.attackerId, now)
        const target = frame.units.find((unit) => unit.id === event.targetId)
        if (target !== undefined) {
          this.units.faceToward(event.attackerId, target.x, target.y)
        }
      }
      if (event.type === 'healCast') {
        this.units.beginAttack(event.healerId, now)
        this.units.beginHealEffect(event.targetId)
        const target = frame.units.find((unit) => unit.id === event.targetId)
        if (target !== undefined) {
          this.units.faceToward(event.healerId, target.x, target.y)
        }
      }
    }
    for (const unit of frame.units) {
      this.effects.trackPosition(unit.id, unit.x, unit.y)
    }
    this.effects.handleEvents(frame.events ?? [], now)
  }

  private handleInteraction(interaction: WorldInteraction, selection: SelectionController): void {
    switch (interaction.type) {
      case 'selection-start':
        selection.beginBox(interaction.screen)
        break
      case 'selection-update':
        selection.updateBox(interaction.screen)
        break
      case 'selection-end':
        selection.finishBox()
        break
      case 'cancel':
        selection.cancelBox()
        break
      case 'secondary-activate':
        if (interaction.target.kind === 'ground') {
          if (this.selectedRallyProducerId === null) {
            const color = selection.get().length > 0 ? SELECTION_COLOR : POINTER_COLOR
            this.ping?.show(interaction.target.position.x, interaction.target.position.y, color)
          }
        }
        break
      case 'primary-activate':
      case 'pointer-move':
        break
      default:
        assertNever(interaction, 'handleInteraction')
    }
    this.callbacks.onInteraction(interaction)
  }

  private tick(ticker: Ticker): void {
    if (
      this.units === null ||
      this.selection === null ||
      this.ping === null ||
      this.effects === null ||
      this.viewport === null
    ) {
      return
    }
    const now = performance.now()
    this.units.advanceAnimations(ticker)
    this.units.interpolate(now)
    this.projectiles?.interpolate(now)
    this.selection.updateRings()
    this.ping.expireIfElapsed(now)
    this.effects.tick(now)
    this.resources?.setViewBounds({
      left: this.viewport.left,
      right: this.viewport.right,
      top: this.viewport.top,
      bottom: this.viewport.bottom
    })
  }

  setSelection(ids: readonly number[]): void {
    this.selection?.set(ids)
  }

  setSelectedRallyProducer(id: number | null): void {
    this.selectedRallyProducerId = id
    this.ping?.hidePersistent()
  }

  setSelectedRallyPoint(point: { readonly x: number; readonly y: number } | null): void {
    if (point === null) {
      this.ping?.hidePersistent()
      return
    }
    this.ping?.showPersistent(point.x, point.y, RALLY_COLOR)
  }

  getSelection(): readonly number[] {
    return this.selection?.get() ?? []
  }

  getSelectionBoxState(): ReturnType<SelectionController['getBoxState']> {
    return this.selection?.getBoxState() ?? { visible: false, x: 0, y: 0, width: 0, height: 0 }
  }

  getPing(): { readonly x: number; readonly y: number } | null {
    return this.ping?.position() ?? null
  }

  getResourceStats(): ReturnType<ResourceLayer['resourceStats']> {
    return this.resources?.resourceStats() ?? EMPTY_RESOURCE_STATS
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
    this.mountId += 1
    this.input?.dispose()
    this.backdrop?.dispose()
    this.backdrop = null
    this.camera?.dispose()
    this.terrain?.dispose()
    this.fog?.dispose()
    this.projectiles?.dispose()
    this.assets.destroy()
    if (this.app !== null) {
      this.app.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true, texture: false, textureSource: false }
      )
      this.app = null
    }
    this.viewport = null
    this.units = null
    this.projectiles = null
    this.fog = null
    this.selection = null
    this.ping = null
    this.selectedRallyProducerId = null
    this.effects = null
    this.terrain = null
    this.worldObjects = null
    this.resources = null
    this.input = null
    this.camera = null
  }

  getUnitPositions(): ReadonlyMap<number, { readonly x: number; readonly y: number }> {
    return this.units?.fixedPositions() ?? new Map()
  }

  getProjectilePresentation(id: number): ReturnType<GameRenderer['getProjectilePresentation']> {
    return this.projectiles?.presentationState(id) ?? null
  }

  getProjectileFeedback(): ReturnType<GameRenderer['getProjectileFeedback']> {
    return this.effects?.projectileFeedback() ?? []
  }

  getUnitAnimationFrame(id: number): number | null {
    return this.units?.animationFrame(id) ?? null
  }

  /** Last reported health of a unit (drives the overhead HP bar), or `null`. */
  getUnitHealth(id: number): { readonly current: number; readonly max: number } | null {
    return this.units?.health(id) ?? null
  }

  getUnitSpriteState(id: number): UnitSpriteState | null {
    return this.units?.spriteState(id) ?? null
  }

  getZoom(): number {
    if (this.viewport === null) {
      return 0
    }
    return this.viewport.scale.x
  }

  setInputProfile(profile: NonNullable<RendererOptions['inputProfile']>): void {
    this.camera?.setProfile(profile)
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
