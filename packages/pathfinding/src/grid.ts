import { FIXED_SCALE, type MapDefinition, type TileCoordinate } from '@rts/shared'

export const ORTHOGONAL_NAVIGATION_COST = 1024
export const DIAGONAL_NAVIGATION_COST = 1448
export const MAX_NAVIGATION_TILES = 65_536

export const NAVIGATION_DIRECTIONS = [
  { direction: 'N', dx: 0, dy: -1, cost: ORTHOGONAL_NAVIGATION_COST },
  { direction: 'E', dx: 1, dy: 0, cost: ORTHOGONAL_NAVIGATION_COST },
  { direction: 'S', dx: 0, dy: 1, cost: ORTHOGONAL_NAVIGATION_COST },
  { direction: 'W', dx: -1, dy: 0, cost: ORTHOGONAL_NAVIGATION_COST },
  { direction: 'NE', dx: 1, dy: -1, cost: DIAGONAL_NAVIGATION_COST },
  { direction: 'SE', dx: 1, dy: 1, cost: DIAGONAL_NAVIGATION_COST },
  { direction: 'SW', dx: -1, dy: 1, cost: DIAGONAL_NAVIGATION_COST },
  { direction: 'NW', dx: -1, dy: -1, cost: DIAGONAL_NAVIGATION_COST }
] as const

export type NavigationDirection = (typeof NAVIGATION_DIRECTIONS)[number]['direction']

export interface NavigationNeighbor {
  readonly direction: NavigationDirection
  readonly coordinate: TileCoordinate
  readonly tileIndex: number
  readonly cost: number
}

export interface NavigationGridOptions {
  readonly width: number
  readonly height: number
  readonly blockedTiles?: readonly TileCoordinate[]
}

export interface NavigationGrid {
  readonly width: number
  readonly height: number
  readonly tileIndex: (coordinate: TileCoordinate) => number | null
  readonly coordinateFromTileIndex: (index: number) => TileCoordinate | null
  readonly isInBounds: (coordinate: TileCoordinate) => boolean
  readonly isWalkable: (coordinate: TileCoordinate) => boolean
  readonly neighbors: (coordinate: TileCoordinate) => readonly NavigationNeighbor[]
}

function validateDimensions(width: number, height: number): number {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('navigation grid dimensions must be positive integers')
  }
  const tileCount = width * height
  if (tileCount > MAX_NAVIGATION_TILES) {
    throw new Error(`navigation grid cannot contain more than ${MAX_NAVIGATION_TILES} tiles`)
  }
  return tileCount
}

function isCoordinate(coordinate: TileCoordinate): boolean {
  return Number.isInteger(coordinate.x) && Number.isInteger(coordinate.y)
}

function createTileIndex(width: number, height: number, coordinate: TileCoordinate): number | null {
  if (!isCoordinate(coordinate) || coordinate.x < 0 || coordinate.y < 0) {
    return null
  }
  if (coordinate.x >= width || coordinate.y >= height) {
    return null
  }
  return coordinate.y * width + coordinate.x
}

function createCoordinateFromIndex(width: number, height: number, index: number): TileCoordinate | null {
  if (!Number.isInteger(index) || index < 0 || index >= width * height) {
    return null
  }
  return { x: index % width, y: Math.floor(index / width) }
}

function validateBlockedTile(width: number, height: number, coordinate: TileCoordinate): number {
  const index = createTileIndex(width, height, coordinate)
  if (index === null) {
    throw new Error('blocked tile must be inside the navigation grid')
  }
  return index
}

function isDiagonal(dx: number, dy: number): boolean {
  return dx !== 0 && dy !== 0
}

function createNeighbor(
  width: number,
  height: number,
  coordinate: TileCoordinate,
  direction: (typeof NAVIGATION_DIRECTIONS)[number],
  blocked: Uint8Array
): NavigationNeighbor | null {
  const next = { x: coordinate.x + direction.dx, y: coordinate.y + direction.dy }
  const index = createTileIndex(width, height, next)
  if (index === null || blocked[index] === 1) {
    return null
  }
  if (
    isDiagonal(direction.dx, direction.dy) &&
    (blocked[validateBlockedTile(width, height, { x: coordinate.x + direction.dx, y: coordinate.y })] === 1 ||
      blocked[validateBlockedTile(width, height, { x: coordinate.x, y: coordinate.y + direction.dy })] === 1)
  ) {
    return null
  }
  return Object.freeze({
    direction: direction.direction,
    coordinate: Object.freeze(next),
    tileIndex: index,
    cost: direction.cost
  })
}

export function createNavigationGrid(options: NavigationGridOptions): NavigationGrid {
  const tileCount = validateDimensions(options.width, options.height)
  const blocked = new Uint8Array(tileCount)
  for (const coordinate of options.blockedTiles ?? []) {
    blocked[validateBlockedTile(options.width, options.height, coordinate)] = 1
  }

  const tileIndex = (coordinate: TileCoordinate): number | null =>
    createTileIndex(options.width, options.height, coordinate)
  const coordinateFromTileIndex = (index: number): TileCoordinate | null =>
    createCoordinateFromIndex(options.width, options.height, index)
  const isInBounds = (coordinate: TileCoordinate): boolean => tileIndex(coordinate) !== null
  const isWalkable = (coordinate: TileCoordinate): boolean => {
    const index = tileIndex(coordinate)
    return index !== null && blocked[index] === 0
  }
  const neighbors = (coordinate: TileCoordinate): readonly NavigationNeighbor[] => {
    if (!isWalkable(coordinate)) {
      return []
    }
    const result: NavigationNeighbor[] = []
    for (const direction of NAVIGATION_DIRECTIONS) {
      const neighbor = createNeighbor(options.width, options.height, coordinate, direction, blocked)
      if (neighbor !== null) {
        result.push(neighbor)
      }
    }
    return Object.freeze(result)
  }

  return Object.freeze({
    width: options.width,
    height: options.height,
    tileIndex,
    coordinateFromTileIndex,
    isInBounds,
    isWalkable,
    neighbors
  })
}

export function createNavigationGridFromMap(map: MapDefinition): NavigationGrid {
  const blockedTiles: TileCoordinate[] = []
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (map.tiles[y * map.width + x] === 'water') {
        blockedTiles.push({ x, y })
      }
    }
  }
  for (const resource of map.resources) {
    blockedTiles.push({
      x: Math.floor(resource.x / FIXED_SCALE),
      y: Math.floor(resource.y / FIXED_SCALE)
    })
  }
  return createNavigationGrid({ width: map.width, height: map.height, blockedTiles })
}
