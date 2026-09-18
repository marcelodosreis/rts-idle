import type { DecorationPlacement, DressingKind, MapDefinition, StairEntry } from '@rts/game-data'
import type { AutoTileTerrain } from './terrain-autotile.js'
import type { ManualDecoration } from './terrain-scene.js'

/**
 * Shared conversion between the sprite lab's 2D `AutoTileTerrain` grid (plus
 * its stair map) and the game's flat `MapDefinition` — the single data format
 * both sides round-trip through. `AutoTileTerrain` and `MapTileKind` are the
 * same union, so this module only converts shape, never terrain meaning.
 */

export interface GridConversion {
  readonly grid: AutoTileTerrain[][]
  readonly stairs: Map<string, 'left' | 'right'>
  readonly decorations: readonly DecorationPlacement[]
}

export interface GridConversionOptions {
  readonly stairs?: readonly [string, 'left' | 'right'][]
  readonly palette?: string
  readonly decorationSeed?: number
  readonly decorations?: readonly DecorationPlacement[]
  readonly decorationCounts?: Readonly<Partial<Record<DressingKind, number>>>
}

/**
 * Map borders are always water: a surrounding water frame keeps the map edges
 * visually sealed and matches the autotile shoreline. Returns a new grid with
 * every border cell forced to `water` (interior cells are copied unchanged).
 */
export function enforceWaterBorder(grid: readonly (readonly AutoTileTerrain[])[]): AutoTileTerrain[][] {
  const height = grid.length
  const width = height > 0 ? grid[0]!.length : 0
  return grid.map((row, y) =>
    row.map((cell, x) => {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        return 'water'
      }
      return cell ?? 'water'
    })
  )
}

/** Stair `"x,y"`-keyed map entries into the game's typed `StairEntry[]`. */
function stairsToEntries(stairs: readonly [string, 'left' | 'right'][]): StairEntry[] {
  return stairs.map(([key, direction]) => {
    const parts = key.split(',')
    return { x: Number(parts[0]), y: Number(parts[1]), direction }
  })
}

/** Game `StairEntry[]` into the lab's `"x,y"`-keyed stair map. */
function entriesToStairs(entries: readonly StairEntry[]): Map<string, 'left' | 'right'> {
  const stairs = new Map<string, 'left' | 'right'>()
  for (const entry of entries) {
    stairs.set(`${entry.x},${entry.y}`, entry.direction)
  }
  return stairs
}

/** Converts a 2D autotile grid (+ optional stairs/metadata) into a `MapDefinition`. */
export function gridToMapDefinition(
  grid: readonly (readonly AutoTileTerrain[])[],
  options?: GridConversionOptions
): MapDefinition {
  const bordered = enforceWaterBorder(grid)
  const height = bordered.length
  const width = height > 0 ? bordered[0]!.length : 0
  const tiles: AutoTileTerrain[] = []
  for (let y = 0; y < height; y += 1) {
    const row = bordered[y]!
    for (let x = 0; x < width; x += 1) {
      tiles.push(row[x] ?? 'water')
    }
  }
  return {
    width,
    height,
    tiles,
    ...(options?.stairs !== undefined ? { stairs: stairsToEntries(options.stairs) } : {}),
    ...(options?.palette !== undefined ? { palette: options.palette } : {}),
    ...(options?.decorationSeed !== undefined ? { decorationSeed: options.decorationSeed } : {}),
    ...(options?.decorations !== undefined ? { decorations: options.decorations } : {}),
    ...(options?.decorationCounts !== undefined ? { decorationCounts: options.decorationCounts } : {})
  }
}

/** Converts a `MapDefinition` back into the 2D autotile grid + stair map. */
export function mapDefinitionToGrid(map: MapDefinition): GridConversion {
  const grid: AutoTileTerrain[][] = []
  for (let y = 0; y < map.height; y += 1) {
    const row: AutoTileTerrain[] = []
    for (let x = 0; x < map.width; x += 1) {
      row.push(map.tiles[y * map.width + x] ?? 'water')
    }
    grid.push(row)
  }
  return {
    grid: enforceWaterBorder(grid),
    stairs: entriesToStairs(map.stairs ?? []),
    decorations: map.decorations ?? []
  }
}

export interface TerrainDressingInput {
  readonly seed: number
  readonly counts: Readonly<Partial<Record<DressingKind, number>>>
}

export interface TerrainSceneInput {
  readonly grid: AutoTileTerrain[][]
  readonly stairs: Map<string, 'left' | 'right'>
  readonly dressing: TerrainDressingInput
  readonly decorations: ReadonlyMap<string, ManualDecoration>
}

/** Explicit placements as the `"x,y"`-keyed map `TerrainScene` renders. */
export function decorationsToMap(decorations: readonly DecorationPlacement[]): Map<string, ManualDecoration> {
  const map = new Map<string, ManualDecoration>()
  for (const decoration of decorations) {
    map.set(`${decoration.x},${decoration.y}`, {
      kind: decoration.kind,
      variant: decoration.variant ?? 0
    })
  }
  return map
}

/**
 * Derives the shared `TerrainScene` input from a `MapDefinition`. The game's
 * `TerrainLayer` renders through this helper so the editor and the game share
 * exactly one terrain path, including explicit decorations.
 */
export function mapToTerrainSceneInput(map: MapDefinition): TerrainSceneInput {
  const conversion = mapDefinitionToGrid(map)
  return {
    grid: conversion.grid,
    stairs: conversion.stairs,
    dressing: {
      seed: map.decorationSeed ?? 1,
      counts: map.decorationCounts ?? {}
    },
    decorations: decorationsToMap(conversion.decorations)
  }
}
