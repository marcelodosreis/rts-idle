// biome-ignore lint/style/noExcessiveLinesPerFile: terrain playground controller (draw + state + render)
import {
  type AutoTileTerrain,
  autotileTile,
  cliffBase,
  createCameraController,
  createTerrainScene,
  DRESSING_ASSET_KEYS,
  type DressingKind,
  enforceWaterBorder,
  gridToMapDefinition,
  type ManualDecoration,
  mapDefinitionToGrid
} from '@rts/renderer'
import type { DecorationPlacement, MapDefinition } from '@rts/shared'
import { Container, Graphics, Sprite } from 'pixi.js'
import { createSectionApp, disposeSectionApp } from '../core/app.js'
import type { SectionContext } from '../core/types.js'
import { type Cell, cellFromLocal } from './terrain-geometry.js'

const SIZE = 32
const TILE = 64
const GRID_PX = SIZE * TILE
const MATRIX_SIZE = 4 * (3 * TILE + 16) + 16
const MATRIX_HEIGHT = MATRIX_SIZE
const GRASS_COLOR = 0x9abf6f
const WATER_COLOR = 0x7db8d8
const CORNER_COLOR = 0xd6cfbc
/** Canvas background is always the water color so no beige ever shows. */
const WATER_BG = 0x47aba9

export type PaintMode = AutoTileTerrain | 'left' | 'right' | 'eraser' | 'decor'
export type MatrixMode = 'flat' | 'elevated' | 'cliff'
export type EditorTab = 'terrain' | 'decorations'

export interface LevelSnapshot {
  readonly grid: readonly (readonly AutoTileTerrain[])[]
  readonly stairs: readonly [string, 'left' | 'right'][]
  readonly decorations: readonly [string, ManualDecoration][]
}

export const PALETTES: readonly string[] = ['color1', 'color2', 'color3', 'color4', 'color5']

const WATER_ROW = 'w'.repeat(SIZE)
const LAND_ROW = `w${'l'.repeat(SIZE - 2)}w`

/** Default level: water border, a pond, an elevated plateau with a stair ramp,
 * and a bottom lake — the shared base layout mirrored by the game's format. */
export const INITIAL: readonly string[] = [
  WATER_ROW,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  `wllwwww${'l'.repeat(24)}w`,
  `wllwwww${'l'.repeat(24)}w`,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  `w${'l'.repeat(12)}${'e'.repeat(5)}${'l'.repeat(13)}w`,
  `w${'l'.repeat(12)}${'e'.repeat(5)}${'l'.repeat(13)}w`,
  `w${'l'.repeat(12)}${'e'.repeat(5)}${'l'.repeat(13)}w`,
  `w${'l'.repeat(12)}${'e'.repeat(5)}${'l'.repeat(13)}w`,
  `w${'l'.repeat(12)}${'e'.repeat(5)}${'l'.repeat(13)}w`,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  `w${'l'.repeat(25)}www${'ll'}w`,
  `w${'l'.repeat(25)}www${'ll'}w`,
  LAND_ROW,
  LAND_ROW,
  LAND_ROW,
  WATER_ROW
]
export const INITIAL_STAIRS: readonly [string, 'left' | 'right'][] = [['15,17', 'left']]

const DRESSING_LABELS: Readonly<Record<DressingKind, string>> = {
  bush: 'bushes',
  tree: 'trees',
  rock: 'rocks',
  cloud: 'clouds',
  water_rock: 'water rocks',
  gold: 'gold',
  gold_stone: 'gold stones',
  wood: 'wood',
  meat: 'meat',
  sheep: 'sheep'
}

/** Dressing kinds and their asset keys, sourced from the shared renderer. */
export const DRESSING_KINDS: readonly {
  readonly kind: DressingKind
  readonly label: string
  readonly keys: readonly string[]
}[] = (Object.keys(DRESSING_ASSET_KEYS) as DressingKind[]).map((kind) => ({
  kind,
  label: DRESSING_LABELS[kind],
  keys: DRESSING_ASSET_KEYS[kind]
}))

function parseGrid(rows: readonly string[]): AutoTileTerrain[][] {
  return rows.map((row) =>
    [...row].map((char): AutoTileTerrain => {
      if (char === 'w') {
        return 'water'
      }
      if (char === 'e') {
        return 'elevated'
      }
      return 'land'
    })
  )
}

export interface TerrainState {
  readonly palette: string
  readonly paint: PaintMode
  readonly staggered: boolean
  readonly step: number
  readonly paused: boolean
  readonly matrixKind: MatrixMode | null
  readonly dressingSeed: number
  readonly dressingCounts: Readonly<Record<DressingKind, number>>
  readonly editorTab: EditorTab
  readonly selectedDecoKind: DressingKind | null
  readonly selectedVariant: number
  readonly showGrid: boolean
  readonly undoStack: readonly LevelSnapshot[]
  readonly redoStack: readonly LevelSnapshot[]
}

export const DEFAULT_TERRAIN_STATE: TerrainState = {
  palette: 'color1',
  paint: 'land',
  staggered: true,
  step: 5,
  paused: false,
  matrixKind: null,
  dressingSeed: 1,
  dressingCounts: Object.fromEntries(DRESSING_KINDS.map((d) => [d.kind, 0])) as Record<DressingKind, number>,
  editorTab: 'terrain',
  selectedDecoKind: null,
  selectedVariant: 0,
  showGrid: true,
  undoStack: [],
  redoStack: []
}

/**
 * Imperative terrain playground controller. Owns the hot-path state (grid,
 * stairs) for performance and exposes discrete control methods + render. React
 * drives it via a stable handle; cell paint/hover never round-trips React.
 * Terrain visuals render through the shared `TerrainScene` so the editor looks
 * exactly like the game.
 */
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: imperativo agrupado (draw + estado + render) por clareza de hot path
export async function createTerrainController(
  host: HTMLElement,
  ctx: SectionContext,
  onReadout: (text: string) => void,
  onCursor: (cell: Cell | null) => void,
  onChange: () => void
): Promise<TerrainController> {
  const hostRect = host.getBoundingClientRect()
  let hostWidth = Math.max(320, Math.round(hostRect.width) || 800)
  let hostHeight = Math.max(320, Math.round(hostRect.height) || 600)
  // Base zoom fits the 32×32 grid with a moderate water border; wheel zooms
  // in/out and middle-drag pans (pixi-viewport camera).
  const TERRAIN_OCCUPANCY = 0.8
  const EDGE_MARGIN = 24
  const fitScaleFor = (width: number, height: number): number =>
    Math.min(
      ((width - EDGE_MARGIN * 2) / GRID_PX) * TERRAIN_OCCUPANCY,
      ((height - EDGE_MARGIN * 2) / GRID_PX) * TERRAIN_OCCUPANCY,
      1
    )
  let fitScale = fitScaleFor(hostWidth, hostHeight)
  // Camera limits: can't zoom out below the full-map fit, can zoom in up to
  // 8×, and the pan is clamped to the grid plus a fixed water margin.
  let minZoom = fitScale
  let maxZoom = fitScale * 8
  const WATER_MARGIN = 8
  const waterCols = SIZE + WATER_MARGIN * 2
  const waterRows = SIZE + WATER_MARGIN * 2
  const waterWidth = waterCols * TILE
  const waterHeight = waterRows * TILE

  let hostResize: ((width: number, height: number) => void) | null = null
  const app = await createSectionApp(host, hostHeight, (width, height) => hostResize?.(width, height))
  app.renderer.background.color = WATER_BG

  const scene = await createTerrainScene(ctx.assets, {
    palette: DEFAULT_TERRAIN_STATE.palette,
    waterCols,
    waterRows
  })

  const camera = createCameraController(app, {
    initialCenter: { x: waterWidth / 2, y: waterHeight / 2 },
    initialZoom: fitScale,
    worldWidth: waterWidth,
    worldHeight: waterHeight,
    input: { profile: 'mouse', minZoom, maxZoom }
  })
  const viewport = camera.viewport

  const worldContainer = new Container()
  // Center the grid inside the water area.
  worldContainer.x = (waterWidth - GRID_PX) / 2
  worldContainer.y = (waterHeight - GRID_PX) / 2
  const gridGraphics = new Graphics()
  const highlightGraphics = new Graphics()
  const matrixContainer = new Container()
  matrixContainer.visible = false
  // A single invisible plane handles all pointer input; grid and highlight are
  // two overlays. No per-cell hit areas are rebuilt on paint.
  const hitPlane = new Graphics().rect(0, 0, GRID_PX, GRID_PX).fill(0xffffff)
  hitPlane.alpha = 0
  hitPlane.eventMode = 'static'
  worldContainer.addChild(scene.container, gridGraphics, highlightGraphics, matrixContainer, hitPlane)
  viewport.addChild(worldContainer)

  const resetCamera = (): void => {
    viewport.setZoom(fitScale)
    viewport.moveCenter(waterWidth / 2, waterHeight / 2)
  }
  resetCamera()

  const grid = parseGrid(INITIAL)
  const stairs = new Map<string, 'left' | 'right'>(INITIAL_STAIRS)
  const decorations = new Map<string, ManualDecoration>()
  let hoveredCell: Cell | null = null
  let state: TerrainState = { ...DEFAULT_TERRAIN_STATE }

  // Re-fits the camera and canvas when the host box changes (window resize or
  // crossing a responsive breakpoint). In matrix-overlay mode the canvas uses
  // the overlay's own aspect instead of the host height.
  const applyResize = (width: number, height: number): void => {
    hostWidth = width
    hostHeight = height
    fitScale = fitScaleFor(width, height)
    minZoom = fitScale
    maxZoom = fitScale * 8
    viewport.clampZoom({ minScale: minZoom, maxScale: maxZoom })
    const matrix = state.matrixKind
    const renderHeight = matrix === null ? height : Math.round(MATRIX_HEIGHT * fitScale)
    app.renderer.resize(width, renderHeight)
    viewport.resize(width, renderHeight)
    if (matrix !== null) {
      renderMatrix(matrix)
      viewport.setZoom(fitScale)
      viewport.moveCenter(worldContainer.x + MATRIX_SIZE / 2, worldContainer.y + MATRIX_SIZE / 2)
    } else {
      resetCamera()
    }
  }
  hostResize = applyResize

  const snapshot = (): LevelSnapshot => ({
    grid: grid.map((row) => [...row]),
    stairs: [...stairs.entries()],
    decorations: [...decorations.entries()]
  })

  const restoreSnapshot = (snap: LevelSnapshot): void => {
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        grid[y]![x] = snap.grid[y]?.[x] ?? 'water'
      }
    }
    stairs.clear()
    for (const [key, value] of snap.stairs) {
      stairs.set(key, value)
    }
    decorations.clear()
    for (const [key, value] of snap.decorations) {
      decorations.set(key, value)
    }
    renderGrid()
  }

  const pushSnapshot = (): void => {
    const snap = snapshot()
    state = {
      ...state,
      undoStack: [...state.undoStack, snap].slice(-50),
      redoStack: []
    }
  }

  const matrixTileSprite = (index: number): Container => {
    const texture = scene.tileTexture(index)
    const sprite = new Container()
    if (texture !== null) {
      const frame = new Sprite(texture)
      frame.width = TILE
      frame.height = TILE
      sprite.addChild(frame)
      return sprite
    }
    const fallback = new Graphics().rect(0, 0, TILE, TILE).fill(GRASS_COLOR)
    sprite.addChild(fallback)
    return sprite
  }

  const setMatrix = (matrixKind: MatrixMode | null): void => {
    const visible = matrixKind === null
    scene.container.visible = visible
    gridGraphics.visible = visible && state.showGrid
    highlightGraphics.visible = visible
    hitPlane.visible = visible
    matrixContainer.visible = !visible
    if (!visible) {
      onCursor(null)
    }
    const height = matrixKind === null ? hostHeight : Math.round(MATRIX_HEIGHT * fitScale)
    app.renderer.resize(app.screen.width, height)
    viewport.resize(app.screen.width, height)
    if (matrixKind !== null) {
      renderMatrix(matrixKind)
      viewport.setZoom(fitScale)
      viewport.moveCenter(worldContainer.x + MATRIX_SIZE / 2, worldContainer.y + MATRIX_SIZE / 2)
    } else {
      resetCamera()
    }
  }

  const cellReadout = (x: number, y: number): string => {
    const stair = stairs.get(`${x},${y}`)
    const kind = grid[y]?.[x] ?? 'water'
    const stairNote = stair === undefined ? '' : `  stairs (${stair} ramp bottom)`
    if (kind === 'water') {
      return `cell (${x},${y}) = water${stairNote}`
    }
    const result = autotileTile(grid, x, y)
    const base = cliffBase(grid, x, y)
    const baseNote = base === null ? '' : `  cliff base below: #${base}`
    return `cell (${x},${y}) = ${kind}  mask ${result.mask}  piece ${result.semanticId}  atlas #${result.atlasIndex}${stairNote}${baseNote}`
  }

  const clear = (container: Container): void => {
    const children = [...container.children]
    container.removeChildren(0, container.children.length)
    for (const child of children) {
      child.destroy()
    }
  }

  const drawGrid = (): void => {
    gridGraphics.clear()
    for (let i = 0; i <= SIZE; i += 1) {
      const p = i * TILE
      gridGraphics.moveTo(p, 0).lineTo(p, GRID_PX)
      gridGraphics.moveTo(0, p).lineTo(GRID_PX, p)
    }
    gridGraphics.stroke({ width: 1, color: 0xffffff, alpha: 0.18 })
  }

  const updateGridVisibility = (): void => {
    gridGraphics.visible = state.matrixKind === null && state.showGrid
  }

  const updateHighlight = (cell: Cell | null): void => {
    hoveredCell = cell
    highlightGraphics.clear()
    if (cell === null || state.matrixKind !== null) {
      return
    }
    highlightGraphics
      .rect(cell.x * TILE, cell.y * TILE, TILE, TILE)
      .fill({ color: 0xffffff, alpha: 0.08 })
      .stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
  }

  const paintCell = (x: number, y: number): void => {
    // The map border is always water: painting there is a no-op.
    if (x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1) {
      onReadout(`cell (${x},${y}) is the locked water border — cannot paint`)
      return
    }
    pushSnapshot()
    if (state.paint === 'eraser') {
      grid[y]![x] = 'water'
      stairs.delete(`${x},${y}`)
      stairs.delete(`${x},${y + 1}`)
      decorations.delete(`${x},${y}`)
    } else if (state.paint === 'decor') {
      const kind = state.selectedDecoKind
      if (kind !== null) {
        if (decorations.has(`${x},${y}`)) {
          decorations.delete(`${x},${y}`)
        } else {
          decorations.set(`${x},${y}`, { kind, variant: state.selectedVariant })
        }
      }
    } else if (state.paint === 'left' || state.paint === 'right') {
      stairs.set(`${x},${y}`, state.paint)
    } else {
      grid[y]![x] = state.paint
      stairs.delete(`${x},${y}`)
      stairs.delete(`${x},${y + 1}`)
      decorations.delete(`${x},${y}`)
    }
    renderGrid()
    onReadout(cellReadout(x, y))
    onChange()
  }

  const cellFromEvent = (event: { getLocalPosition: (target: Container) => { x: number; y: number } }): Cell | null => {
    const local = event.getLocalPosition(worldContainer)
    return cellFromLocal(local.x, local.y, SIZE, TILE)
  }

  hitPlane.on('pointermove', (event) => {
    const cell = cellFromEvent(event)
    updateHighlight(cell)
    onCursor(cell)
    if (cell !== null) {
      onReadout(cellReadout(cell.x, cell.y))
    }
  })
  hitPlane.on('pointerout', () => {
    updateHighlight(null)
    onCursor(null)
  })
  hitPlane.on('pointerdown', (event) => {
    if (state.matrixKind !== null) {
      return
    }
    const cell = cellFromEvent(event)
    if (cell !== null) {
      paintCell(cell.x, cell.y)
    }
  })

  const renderGrid = (): void => {
    scene.render(
      grid,
      stairs,
      {
        seed: state.dressingSeed,
        counts: state.dressingCounts
      },
      decorations
    )
    updateGridVisibility()
    updateHighlight(hoveredCell)
  }

  drawGrid()

  const maskNeighbor = (bit: string): AutoTileTerrain => (bit === '1' ? 'land' : 'water')

  const renderMatrix = (matrixKind: MatrixMode): void => {
    clear(matrixContainer)
    if (matrixKind === 'cliff') {
      renderCliffMatrix()
      return
    }
    for (let mask = 0; mask < 16; mask += 1) {
      const bits = mask.toString(2).padStart(4, '0')
      const center: AutoTileTerrain = matrixKind === 'elevated' ? 'elevated' : 'land'
      const panelGrid: AutoTileTerrain[][] = [
        [center, maskNeighbor(bits.charAt(0)), center],
        [maskNeighbor(bits.charAt(3)), center, maskNeighbor(bits.charAt(1))],
        [center, maskNeighbor(bits.charAt(2)), center]
      ]
      const col = mask % 4
      const row = Math.floor(mask / 4)
      const panelX = col * (3 * TILE + 16) + 8
      const panelY = row * (3 * TILE + 16) + 8
      const cells: (AutoTileTerrain | 'corner')[] = [
        'corner',
        maskNeighbor(bits.charAt(0)),
        'corner',
        maskNeighbor(bits.charAt(3)),
        center,
        maskNeighbor(bits.charAt(1)),
        'corner',
        maskNeighbor(bits.charAt(2)),
        'corner'
      ]
      for (let i = 0; i < cells.length; i += 1) {
        const cell = cells[i] ?? 'corner'
        const cx = panelX + (i % 3) * TILE
        const cy = panelY + Math.floor(i / 3) * TILE
        const rect = new Graphics()
        let color = CORNER_COLOR
        if (cell === 'water') {
          color = WATER_COLOR
        } else if (cell === 'land' || cell === 'elevated') {
          color = GRASS_COLOR
        }
        rect.rect(cx, cy, TILE, TILE).fill(color)
        matrixContainer.addChild(rect)
      }
      const result = autotileTile(panelGrid, 1, 1)
      const centerTile = matrixTileSprite(result.atlasIndex ?? 0)
      centerTile.position.set(panelX + TILE, panelY + TILE)
      centerTile.eventMode = 'static'
      centerTile.on('pointerover', () => {
        onReadout(`mask ${bits}  piece ${result.semanticId}  atlas #${result.atlasIndex}`)
      })
      matrixContainer.addChild(centerTile)
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: cliff-case matrix renderer (4 panes)
  const renderCliffMatrix = (): void => {
    const cases: readonly { readonly label: string; readonly rows: readonly string[] }[] = [
      { label: 'south land · ends open', rows: ['ellle', 'ellle', 'eeeee'] },
      { label: 'south land · ends closed', rows: ['ellle', 'ellle', 'eeee', 'ellle'] },
      { label: 'south water · ends open', rows: ['ellle', 'ellle', 'ewwwe'] },
      { label: 'south water · ends closed', rows: ['ellle', 'ellle', 'eeee', 'ellle'] }
    ]
    for (let i = 0; i < cases.length; i += 1) {
      const spec = cases[i]!
      const panelGrid = parseGrid(spec.rows)
      const col = i % 2
      const row = Math.floor(i / 2)
      const panelX = col * (5 * TILE + 24) + 8
      const panelY = row * (4 * TILE + 16) + 8
      for (let y = 0; y < 4; y += 1) {
        for (let x = 0; x < 5; x += 1) {
          const cell = panelGrid[y]?.[x]
          const rect = new Graphics()
          let color = CORNER_COLOR
          if (cell === 'water') {
            color = WATER_COLOR
          } else if (cell === 'land' || cell === 'elevated') {
            color = GRASS_COLOR
          }
          rect.rect(panelX + x * TILE, panelY + y * TILE, TILE, TILE).fill(color)
          matrixContainer.addChild(rect)
        }
      }
      for (let y = 0; y < 4; y += 1) {
        for (let x = 0; x < 5; x += 1) {
          const cell = panelGrid[y]?.[x]
          if (cell === undefined || cell === 'water') {
            continue
          }
          const piece = autotileTile(panelGrid, x, y)
          if (piece.atlasIndex !== null) {
            const sprite = matrixTileSprite(piece.atlasIndex)
            sprite.position.set(panelX + x * TILE, panelY + y * TILE)
            matrixContainer.addChild(sprite)
          }
          const base = cliffBase(panelGrid, x, y)
          if (base !== null) {
            const baseSprite = matrixTileSprite(base)
            baseSprite.position.set(panelX + x * TILE, panelY + y * TILE + TILE)
            matrixContainer.addChild(baseSprite)
          }
        }
      }
    }
  }

  const applyGrid = (rows: readonly string[]): void => {
    const fresh = parseGrid(rows)
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        grid[y]![x] = fresh[y]?.[x] ?? 'water'
      }
    }
    stairs.clear()
    decorations.clear()
    renderGrid()
    onChange()
  }

  renderGrid()

  return {
    setState(next: TerrainState): void {
      const paletteChanged = next.palette !== state.palette
      state = next
      if (paletteChanged) {
        void scene.setPalette(next.palette).then(() => {
          renderGrid()
        })
        return
      }
      renderGrid()
    },
    reset(): void {
      applyGrid(INITIAL)
      for (const [key, dir] of INITIAL_STAIRS) {
        stairs.set(key, dir)
      }
      decorations.clear()
      renderGrid()
    },
    setMatrix,
    resetCamera,
    exportLevel(): LevelData {
      return {
        grid: grid.map((row) => [...row]),
        stairs: [...stairs.entries()],
        decorations: [...decorations.entries()]
      }
    },
    importLevel(data: LevelData): void {
      const bordered = enforceWaterBorder(data.grid)
      for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          grid[y]![x] = bordered[y]?.[x] ?? 'water'
        }
      }
      stairs.clear()
      for (const [key, value] of data.stairs) {
        stairs.set(key, value)
      }
      decorations.clear()
      if (data.decorations !== undefined) {
        for (const [key, value] of data.decorations) {
          decorations.set(key, value)
        }
      }
      renderGrid()
      onChange()
    },
    exportMapDefinition(): MapDefinition {
      const placements: DecorationPlacement[] = []
      for (const [key, value] of decorations) {
        const parts = key.split(',')
        placements.push({
          x: Number(parts[0] ?? 0),
          y: Number(parts[1] ?? 0),
          kind: value.kind,
          variant: value.variant
        })
      }
      const counts = Object.fromEntries(Object.entries(state.dressingCounts).filter(([, count]) => count > 0))
      return gridToMapDefinition(grid, {
        stairs: [...stairs.entries()],
        palette: state.palette,
        decorationSeed: state.dressingSeed,
        ...(placements.length > 0 ? { decorations: placements } : {}),
        ...(Object.keys(counts).length > 0 ? { decorationCounts: counts } : {})
      })
    },
    importMapDefinition(map: MapDefinition): void {
      const conversion = mapDefinitionToGrid(map)
      for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          grid[y]![x] = conversion.grid[y]?.[x] ?? 'water'
        }
      }
      stairs.clear()
      for (const [key, value] of conversion.stairs) {
        stairs.set(key, value)
      }
      decorations.clear()
      for (const decoration of conversion.decorations) {
        decorations.set(`${decoration.x},${decoration.y}`, {
          kind: decoration.kind,
          variant: decoration.variant ?? 0
        })
      }
      if (map.palette !== undefined) {
        state = { ...state, palette: map.palette }
        void scene.setPalette(map.palette)
      }
      if (map.decorationSeed !== undefined) {
        state = { ...state, dressingSeed: map.decorationSeed }
      }
      if (map.decorationCounts !== undefined) {
        const merged = { ...state.dressingCounts }
        for (const [kind, count] of Object.entries(map.decorationCounts)) {
          if (count !== undefined) {
            merged[kind as DressingKind] = count
          }
        }
        state = { ...state, dressingCounts: merged }
      }
      renderGrid()
      onChange()
    },
    undo(): LevelSnapshot | null {
      if (state.undoStack.length === 0) {
        return null
      }
      const currentSnap = snapshot()
      const prev = state.undoStack[state.undoStack.length - 1]!
      state = {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, currentSnap]
      }
      restoreSnapshot(prev)
      onChange()
      return prev
    },
    redo(): LevelSnapshot | null {
      if (state.redoStack.length === 0) {
        return null
      }
      const currentSnap = snapshot()
      const next = state.redoStack[state.redoStack.length - 1]!
      state = {
        ...state,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, currentSnap]
      }
      restoreSnapshot(next)
      onChange()
      return next
    },
    pushSnapshot,
    pause(): void {
      app.ticker.stop()
    },
    resume(): void {
      app.ticker.start()
    },
    destroy(): void {
      camera.dispose()
      scene.destroy()
      disposeSectionApp(app)
      app.destroy()
    }
  }
}

export interface LevelData {
  readonly grid: readonly (readonly AutoTileTerrain[])[]
  readonly stairs: readonly [string, 'left' | 'right'][]
  readonly decorations?: readonly [string, ManualDecoration][]
}

export interface TerrainController {
  setState(next: TerrainState): void
  reset(): void
  setMatrix(matrixKind: MatrixMode | null): void
  resetCamera(): void
  exportLevel(): LevelData
  importLevel(data: LevelData): void
  exportMapDefinition(): MapDefinition
  importMapDefinition(map: MapDefinition): void
  destroy(): void
  pause(): void
  resume(): void
  undo(): LevelSnapshot | null
  redo(): LevelSnapshot | null
  pushSnapshot(): void
}
