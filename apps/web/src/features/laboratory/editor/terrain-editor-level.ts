import {
  type AutoTileTerrain,
  type DressingKind,
  enforceWaterBorder,
  gridToMapDefinition,
  type ManualDecoration,
  mapDefinitionToGrid
} from '@rts/renderer'
import type { DecorationPlacement, MapDefinition } from '@rts/shared'
import { type LevelData, type LevelSnapshot, parseGrid, SIZE, type TerrainState } from './terrain-editor-data.js'

/** Mutable level buffers owned by the editor controller. */
export interface LevelBuffers {
  readonly grid: AutoTileTerrain[][]
  readonly stairs: Map<string, 'left' | 'right'>
  readonly decorations: Map<string, ManualDecoration>
}

export function snapshotLevel(buffers: LevelBuffers): LevelSnapshot {
  return {
    grid: buffers.grid.map((row) => [...row]),
    stairs: [...buffers.stairs.entries()],
    decorations: [...buffers.decorations.entries()]
  }
}

export function restoreLevel(buffers: LevelBuffers, snap: LevelSnapshot): void {
  setGrid(buffers.grid, snap.grid)
  buffers.stairs.clear()
  for (const [key, value] of snap.stairs) {
    buffers.stairs.set(key, value)
  }
  buffers.decorations.clear()
  for (const [key, value] of snap.decorations) {
    buffers.decorations.set(key, value)
  }
}

function setGrid(grid: AutoTileTerrain[][], source: readonly (readonly AutoTileTerrain[])[]): void {
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      grid[y]![x] = source[y]?.[x] ?? 'water'
    }
  }
}

/** Replaces the grid from ASCII rows and clears stairs/decorations. */
export function applyGridRows(buffers: LevelBuffers, rows: readonly string[]): void {
  setGrid(buffers.grid, parseGrid(rows))
  buffers.stairs.clear()
  buffers.decorations.clear()
}

export function exportLevelData(buffers: LevelBuffers): LevelData {
  return {
    grid: buffers.grid.map((row) => [...row]),
    stairs: [...buffers.stairs.entries()],
    decorations: [...buffers.decorations.entries()]
  }
}

export function importLevelData(buffers: LevelBuffers, data: LevelData): void {
  setGrid(buffers.grid, enforceWaterBorder(data.grid))
  buffers.stairs.clear()
  for (const [key, value] of data.stairs) {
    buffers.stairs.set(key, value)
  }
  buffers.decorations.clear()
  if (data.decorations !== undefined) {
    for (const [key, value] of data.decorations) {
      buffers.decorations.set(key, value)
    }
  }
}

export function exportMapDefinition(buffers: LevelBuffers, state: TerrainState): MapDefinition {
  const placements: DecorationPlacement[] = []
  for (const [key, value] of buffers.decorations) {
    const parts = key.split(',')
    placements.push({ x: Number(parts[0] ?? 0), y: Number(parts[1] ?? 0), kind: value.kind, variant: value.variant })
  }
  const counts = Object.fromEntries(Object.entries(state.dressingCounts).filter(([, count]) => count > 0))
  return gridToMapDefinition(buffers.grid, {
    stairs: [...buffers.stairs.entries()],
    palette: state.palette,
    decorationSeed: state.dressingSeed,
    ...(placements.length > 0 ? { decorations: placements } : {}),
    ...(Object.keys(counts).length > 0 ? { decorationCounts: counts } : {})
  })
}

/** Options extracted from an imported map that the controller must apply. */
export interface ImportedMapOptions {
  readonly palette?: string
  readonly decorationSeed?: number
  readonly dressingCounts?: Readonly<Partial<Record<DressingKind, number>>>
}

export function importMapInto(buffers: LevelBuffers, map: MapDefinition): ImportedMapOptions {
  const conversion = mapDefinitionToGrid(map)
  setGrid(buffers.grid, conversion.grid)
  buffers.stairs.clear()
  for (const [key, value] of conversion.stairs) {
    buffers.stairs.set(key, value)
  }
  buffers.decorations.clear()
  for (const decoration of conversion.decorations) {
    buffers.decorations.set(`${decoration.x},${decoration.y}`, {
      kind: decoration.kind,
      variant: decoration.variant ?? 0
    })
  }
  return {
    ...(map.palette !== undefined ? { palette: map.palette } : {}),
    ...(map.decorationSeed !== undefined ? { decorationSeed: map.decorationSeed } : {}),
    ...(map.decorationCounts !== undefined ? { dressingCounts: map.decorationCounts } : {})
  }
}
