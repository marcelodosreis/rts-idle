import { createCameraController, createTerrainScene, type ManualDecoration } from '@rts/renderer'
import type { MapDefinition } from '@rts/shared'
import { Container, Graphics } from 'pixi.js'
import { createSectionApp, disposeSectionApp } from '../shared/core/app.js'
import type { SectionContext } from '../shared/core/types.js'
import {
  DEFAULT_TERRAIN_STATE,
  GRID_PX,
  INITIAL,
  INITIAL_STAIRS,
  type LevelData,
  type LevelSnapshot,
  MATRIX_HEIGHT,
  MATRIX_SIZE,
  type MatrixMode,
  parseGrid,
  SIZE,
  type TerrainController,
  type TerrainState,
  TILE,
  WATER_BG
} from './terrain-editor-data.js'
import {
  applyGridRows,
  exportLevelData,
  exportMapDefinition,
  importLevelData,
  importMapInto,
  type LevelBuffers,
  restoreLevel,
  snapshotLevel
} from './terrain-editor-level.js'
import { renderMatrixInto } from './terrain-editor-matrix.js'
import { bindEditorPointer, drawEditorGrid, updateGridVisibility, updateHighlight } from './terrain-editor-overlays.js'
import { cellReadout, paintCell } from './terrain-editor-paint.js'
import type { Cell } from './terrain-geometry.js'

const TERRAIN_OCCUPANCY = 0.8
const EDGE_MARGIN = 24
const WATER_MARGIN = 8

type AppHandle = Awaited<ReturnType<typeof createSectionApp>>

function fitScaleFor(width: number, height: number): number {
  return Math.min(
    ((width - EDGE_MARGIN * 2) / GRID_PX) * TERRAIN_OCCUPANCY,
    ((height - EDGE_MARGIN * 2) / GRID_PX) * TERRAIN_OCCUPANCY,
    1
  )
}

/** Imperative terrain playground controller (state + render + input). */
export class TerrainEditorController implements TerrainController {
  private readonly app: AppHandle
  private readonly scene: Awaited<ReturnType<typeof createTerrainScene>>
  private readonly camera: ReturnType<typeof createCameraController>
  private readonly viewport: ReturnType<typeof createCameraController>['viewport']
  private readonly worldContainer = new Container()
  private readonly gridGraphics = new Graphics()
  private readonly highlightGraphics = new Graphics()
  private readonly matrixContainer = new Container()
  private readonly hitPlane: Graphics
  private readonly grid = parseGrid(INITIAL)
  private readonly stairs = new Map<string, 'left' | 'right'>(INITIAL_STAIRS)
  private readonly decorations = new Map<string, ManualDecoration>()
  private readonly waterWidth = (SIZE + WATER_MARGIN * 2) * TILE
  private readonly waterHeight = (SIZE + WATER_MARGIN * 2) * TILE
  private state: TerrainState = { ...DEFAULT_TERRAIN_STATE }
  private hostWidth: number
  private hostHeight: number
  private fitScale: number
  private minZoom: number
  private maxZoom: number
  private hoveredCell: Cell | null = null
  private readonly onReadout: (text: string) => void
  private readonly onCursor: (cell: Cell | null) => void
  private readonly onChange: () => void

  private constructor(init: {
    readonly app: AppHandle
    readonly scene: Awaited<ReturnType<typeof createTerrainScene>>
    readonly camera: ReturnType<typeof createCameraController>
    readonly hostWidth: number
    readonly hostHeight: number
    readonly onReadout: (text: string) => void
    readonly onCursor: (cell: Cell | null) => void
    readonly onChange: () => void
  }) {
    this.app = init.app
    this.scene = init.scene
    this.camera = init.camera
    this.viewport = init.camera.viewport
    this.hostWidth = init.hostWidth
    this.hostHeight = init.hostHeight
    this.fitScale = fitScaleFor(init.hostWidth, init.hostHeight)
    this.minZoom = this.fitScale
    this.maxZoom = this.fitScale * 8
    this.hitPlane = new Graphics().rect(0, 0, GRID_PX, GRID_PX).fill(0xffffff)
    this.onReadout = init.onReadout
    this.onCursor = init.onCursor
    this.onChange = init.onChange
  }

  static async create(
    host: HTMLElement,
    ctx: SectionContext,
    onReadout: (text: string) => void,
    onCursor: (cell: Cell | null) => void,
    onChange: () => void
  ): Promise<TerrainController> {
    const rect = host.getBoundingClientRect()
    const hostWidth = Math.max(320, Math.round(rect.width) || 800)
    const hostHeight = Math.max(320, Math.round(rect.height) || 600)
    let controller: TerrainEditorController | null = null
    const app = await createSectionApp(host, hostHeight, (width, height) => controller?.applyResize(width, height))
    app.renderer.background.color = WATER_BG
    const scene = await createTerrainScene(ctx.assets, {
      palette: DEFAULT_TERRAIN_STATE.palette,
      waterCols: SIZE + WATER_MARGIN * 2,
      waterRows: SIZE + WATER_MARGIN * 2
    })
    const fitScale = fitScaleFor(hostWidth, hostHeight)
    const camera = createCameraController(app, {
      initialCenter: { x: ((SIZE + WATER_MARGIN * 2) * TILE) / 2, y: ((SIZE + WATER_MARGIN * 2) * TILE) / 2 },
      initialZoom: fitScale,
      worldWidth: (SIZE + WATER_MARGIN * 2) * TILE,
      worldHeight: (SIZE + WATER_MARGIN * 2) * TILE,
      input: { profile: 'mouse', minZoom: fitScale, maxZoom: fitScale * 8 }
    })
    controller = new TerrainEditorController({
      app,
      scene,
      camera,
      hostWidth,
      hostHeight,
      onReadout,
      onCursor,
      onChange
    })
    controller.setupWorld()
    return controller
  }

  private setupWorld(): void {
    this.worldContainer.x = (this.waterWidth - GRID_PX) / 2
    this.worldContainer.y = (this.waterHeight - GRID_PX) / 2
    this.matrixContainer.visible = false
    this.hitPlane.alpha = 0
    this.hitPlane.eventMode = 'static'
    this.worldContainer.addChild(
      this.scene.container,
      this.gridGraphics,
      this.highlightGraphics,
      this.matrixContainer,
      this.hitPlane
    )
    this.viewport.addChild(this.worldContainer)
    this.bindInput()
    this.drawGrid()
    this.renderGrid()
  }

  private bindInput(): void {
    bindEditorPointer(this.hitPlane, this.worldContainer, {
      isMatrixOpen: () => this.state.matrixKind !== null,
      onCell: (cell) => {
        updateHighlight(this.highlightGraphics, cell, this.state.matrixKind)
        this.onCursor(cell)
      },
      onReadoutCell: (x, y) => this.onReadout(this.cellReadout(x, y)),
      onPaint: (x, y) => this.paintCell(x, y)
    })
  }

  private paintCell(x: number, y: number): void {
    paintCell(
      {
        buffers: this.buffers(),
        state: this.state,
        pushSnapshot: () => this.pushSnapshot(),
        renderGrid: () => this.renderGrid(),
        readout: this.onReadout,
        changed: this.onChange
      },
      x,
      y
    )
  }

  private applyResize(width: number, height: number): void {
    this.hostWidth = width
    this.hostHeight = height
    this.fitScale = fitScaleFor(width, height)
    this.minZoom = this.fitScale
    this.maxZoom = this.fitScale * 8
    this.viewport.clampZoom({ minScale: this.minZoom, maxScale: this.maxZoom })
    const matrix = this.state.matrixKind
    const renderHeight = matrix === null ? height : Math.round(MATRIX_HEIGHT * this.fitScale)
    this.app.renderer.resize(width, renderHeight)
    this.viewport.resize(width, renderHeight)
    if (matrix !== null) {
      renderMatrixInto(this.matrixContainer, this.scene, matrix, this.onReadout)
      this.viewport.setZoom(this.fitScale)
      this.viewport.moveCenter(this.worldContainer.x + MATRIX_SIZE / 2, this.worldContainer.y + MATRIX_SIZE / 2)
    } else {
      this.resetCamera()
    }
  }

  resetCamera(): void {
    this.viewport.setZoom(this.fitScale)
    this.viewport.moveCenter(this.waterWidth / 2, this.waterHeight / 2)
  }

  private buffers(): LevelBuffers {
    return { grid: this.grid, stairs: this.stairs, decorations: this.decorations }
  }

  private snapshot(): LevelSnapshot {
    return snapshotLevel(this.buffers())
  }

  private restoreSnapshot(snap: LevelSnapshot): void {
    restoreLevel(this.buffers(), snap)
    this.renderGrid()
  }

  pushSnapshot(): void {
    const snap = this.snapshot()
    this.state = { ...this.state, undoStack: [...this.state.undoStack, snap].slice(-50), redoStack: [] }
  }

  setMatrix(matrixKind: MatrixMode | null): void {
    const visible = matrixKind === null
    this.scene.container.visible = visible
    this.gridGraphics.visible = visible && this.state.showGrid
    this.highlightGraphics.visible = visible
    this.hitPlane.visible = visible
    this.matrixContainer.visible = !visible
    if (!visible) {
      this.onCursor(null)
    }
    const height = matrixKind === null ? this.hostHeight : Math.round(MATRIX_HEIGHT * this.fitScale)
    this.app.renderer.resize(this.app.screen.width, height)
    this.viewport.resize(this.app.screen.width, height)
    if (matrixKind !== null) {
      renderMatrixInto(this.matrixContainer, this.scene, matrixKind, this.onReadout)
      this.viewport.setZoom(this.fitScale)
      this.viewport.moveCenter(this.worldContainer.x + MATRIX_SIZE / 2, this.worldContainer.y + MATRIX_SIZE / 2)
    } else {
      this.resetCamera()
    }
  }

  private cellReadout(x: number, y: number): string {
    return cellReadout(this.buffers(), x, y)
  }

  private drawGrid(): void {
    drawEditorGrid(this.gridGraphics)
  }

  private renderGrid(): void {
    this.scene.render(
      this.grid,
      this.stairs,
      { seed: this.state.dressingSeed, counts: this.state.dressingCounts },
      this.decorations
    )
    updateGridVisibility(this.gridGraphics, this.state.matrixKind, this.state.showGrid)
    updateHighlight(this.highlightGraphics, this.hoveredCell, this.state.matrixKind)
  }

  private applyGrid(rows: readonly string[]): void {
    applyGridRows(this.buffers(), rows)
    this.renderGrid()
    this.onChange()
  }

  setState(next: TerrainState): void {
    const paletteChanged = next.palette !== this.state.palette
    this.state = next
    if (paletteChanged) {
      void this.scene.setPalette(next.palette).then(() => this.renderGrid())
      return
    }
    this.renderGrid()
  }

  reset(): void {
    this.applyGrid(INITIAL)
    for (const [key, direction] of INITIAL_STAIRS) {
      this.stairs.set(key, direction)
    }
    this.decorations.clear()
    this.renderGrid()
  }

  exportLevel(): LevelData {
    return exportLevelData(this.buffers())
  }

  importLevel(data: LevelData): void {
    importLevelData(this.buffers(), data)
    this.renderGrid()
    this.onChange()
  }

  exportMapDefinition(): MapDefinition {
    return exportMapDefinition(this.buffers(), this.state)
  }

  importMapDefinition(map: MapDefinition): void {
    const options = importMapInto(this.buffers(), map)
    this.applyMapOptions(options)
    this.renderGrid()
    this.onChange()
  }

  private applyMapOptions(options: {
    readonly palette?: string
    readonly decorationSeed?: number
    readonly dressingCounts?: Readonly<Partial<Record<keyof TerrainState['dressingCounts'], number>>>
  }): void {
    if (options.palette !== undefined) {
      this.state = { ...this.state, palette: options.palette }
      void this.scene.setPalette(options.palette)
    }
    if (options.decorationSeed !== undefined) {
      this.state = { ...this.state, dressingSeed: options.decorationSeed }
    }
    if (options.dressingCounts !== undefined) {
      const merged = { ...this.state.dressingCounts }
      for (const [kind, count] of Object.entries(options.dressingCounts)) {
        if (count !== undefined) {
          merged[kind as keyof typeof merged] = count
        }
      }
      this.state = { ...this.state, dressingCounts: merged }
    }
  }

  undo(): LevelSnapshot | null {
    if (this.state.undoStack.length === 0) {
      return null
    }
    const current = this.snapshot()
    const previous = this.state.undoStack[this.state.undoStack.length - 1]!
    this.state = {
      ...this.state,
      undoStack: this.state.undoStack.slice(0, -1),
      redoStack: [...this.state.redoStack, current]
    }
    this.restoreSnapshot(previous)
    this.onChange()
    return previous
  }

  redo(): LevelSnapshot | null {
    if (this.state.redoStack.length === 0) {
      return null
    }
    const current = this.snapshot()
    const next = this.state.redoStack[this.state.redoStack.length - 1]!
    this.state = {
      ...this.state,
      redoStack: this.state.redoStack.slice(0, -1),
      undoStack: [...this.state.undoStack, current]
    }
    this.restoreSnapshot(next)
    this.onChange()
    return next
  }

  pause(): void {
    this.app.ticker.stop()
  }

  resume(): void {
    this.app.ticker.start()
  }

  destroy(): void {
    this.camera.dispose()
    this.scene.destroy()
    disposeSectionApp(this.app)
    this.app.destroy()
  }
}
