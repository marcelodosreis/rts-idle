import type { MapDefinition, StairEntry } from '@rts/game-data'
import type { AutoTileTerrain } from './terrain-autotile.js'

/**
 * Shared conversion between the sprite lab's 2D `AutoTileTerrain` grid (plus
 * its stair map) and the game's flat `MapDefinition` — the single data format
 * both sides round-trip through. `AutoTileTerrain` and `MapTileKind` are the
 * same union, so this module only converts shape, never terrain meaning.
 */

export interface GridConversion {
  readonly grid: AutoTileTerrain[][]
  readonly stairs: Map<string, 'left' | 'right'>
}

export interface GridConversionOptions {
  readonly stairs?: readonly [string, 'left' | 'right'][]
  readonly palette?: string
  readonly decorationSeed?: number
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
    ...(options?.decorationSeed !== undefined ? { decorationSeed: options.decorationSeed } : {})
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
  return { grid: enforceWaterBorder(grid), stairs: entriesToStairs(map.stairs ?? []) }
}
