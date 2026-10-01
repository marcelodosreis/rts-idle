import { type AutoTileTerrain, DRESSING_ASSET_KEYS, type DressingKind, type ManualDecoration } from '@rts/renderer'
import { field, isRecord, type MapDefinition, TILE_PIXELS } from '@rts/shared'

export { CORNER_COLOR, GRASS_COLOR, WATER_BG, WATER_COLOR } from '@rts/renderer'

export const SIZE = 32
export const TILE = TILE_PIXELS
export const GRID_PX = SIZE * TILE
export const MATRIX_SIZE = 4 * (3 * TILE + 16) + 16
export const MATRIX_HEIGHT = MATRIX_SIZE
/** Canvas background is always the water color so no beige ever shows. */

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
export const DRESSING_KIND_OPTIONS: readonly {
  readonly kind: DressingKind
  readonly label: string
  readonly keys: readonly string[]
}[] = (Object.keys(DRESSING_ASSET_KEYS) as DressingKind[]).map((kind) => ({
  kind,
  label: DRESSING_LABELS[kind],
  keys: DRESSING_ASSET_KEYS[kind]
}))

export function parseGrid(rows: readonly string[]): AutoTileTerrain[][] {
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
  dressingCounts: Object.fromEntries(DRESSING_KIND_OPTIONS.map((deco) => [deco.kind, 0])) as Record<
    DressingKind,
    number
  >,
  editorTab: 'terrain',
  selectedDecoKind: null,
  selectedVariant: 0,
  showGrid: true,
  undoStack: [],
  redoStack: []
}

export interface LevelData {
  readonly grid: readonly (readonly AutoTileTerrain[])[]
  readonly stairs: readonly [string, 'left' | 'right'][]
  readonly decorations?: readonly [string, ManualDecoration][]
}

/** Validates an untrusted lab-level payload before importing it (fail-closed). */
export function isLevelData(value: unknown): value is LevelData {
  return (
    isRecord(value) &&
    Array.isArray(field(value, 'grid')) &&
    (field(value, 'grid') as readonly unknown[]).every((row) => Array.isArray(row)) &&
    Array.isArray(field(value, 'stairs'))
  )
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
