export interface SpatialBounds {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

export interface SpatialIndexEntry<EntityId extends number = number> {
  readonly id: EntityId
  readonly bounds: SpatialBounds
}

export interface SpatialIndexOptions<EntityId extends number = number> {
  readonly cellSize: number
  readonly entries: readonly SpatialIndexEntry<EntityId>[]
}

export interface SpatialIndex<EntityId extends number = number> {
  readonly cellSize: number
  readonly boundsFor: (id: EntityId) => SpatialBounds | undefined
  readonly query: (bounds: SpatialBounds) => readonly EntityId[]
}

function validateBounds(bounds: SpatialBounds): SpatialBounds {
  if (
    !Number.isInteger(bounds.minX) ||
    !Number.isInteger(bounds.minY) ||
    !Number.isInteger(bounds.maxX) ||
    !Number.isInteger(bounds.maxY) ||
    bounds.minX > bounds.maxX ||
    bounds.minY > bounds.maxY
  ) {
    throw new Error('spatial bounds must contain ordered integer coordinates')
  }
  return Object.freeze({ ...bounds })
}

function validateCellSize(cellSize: number): void {
  if (!Number.isInteger(cellSize) || cellSize <= 0) {
    throw new Error('spatial index cell size must be a positive integer')
  }
}

function cellCoordinate(value: number, cellSize: number): number {
  return Math.floor(value / cellSize)
}

function cellKey(x: number, y: number): string {
  return `${x}:${y}`
}

function cellsFor(bounds: SpatialBounds, cellSize: number): readonly string[] {
  const minX = cellCoordinate(bounds.minX, cellSize)
  const maxX = cellCoordinate(bounds.maxX, cellSize)
  const minY = cellCoordinate(bounds.minY, cellSize)
  const maxY = cellCoordinate(bounds.maxY, cellSize)
  const keys: string[] = []
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      keys.push(cellKey(x, y))
    }
  }
  return keys
}

function intersects(left: SpatialBounds, right: SpatialBounds): boolean {
  return left.minX <= right.maxX && left.maxX >= right.minX && left.minY <= right.maxY && left.maxY >= right.minY
}

function validateEntry<EntityId extends number>(
  entry: SpatialIndexEntry<EntityId>
): { readonly id: EntityId; readonly bounds: SpatialBounds } {
  if (!Number.isInteger(entry.id) || entry.id < 0) {
    throw new Error('spatial index entry id must be a non-negative integer')
  }
  return { id: entry.id, bounds: validateBounds(entry.bounds) }
}

function candidateIds<EntityId extends number>(
  buckets: ReadonlyMap<string, readonly EntityId[]>,
  bounds: SpatialBounds,
  cellSize: number
): readonly EntityId[] {
  const candidates = new Set<EntityId>()
  for (const key of cellsFor(bounds, cellSize)) {
    for (const id of buckets.get(key) ?? []) {
      candidates.add(id)
    }
  }
  return [...candidates].sort((left, right) => left - right)
}

export function createSpatialIndex<EntityId extends number = number>(
  options: SpatialIndexOptions<EntityId>
): SpatialIndex<EntityId> {
  validateCellSize(options.cellSize)
  const entries = new Map<EntityId, SpatialBounds>()
  const mutableBuckets = new Map<string, EntityId[]>()
  for (const input of options.entries) {
    const entry = validateEntry(input)
    if (entries.has(entry.id)) {
      throw new Error(`spatial index entry ${entry.id} is duplicated`)
    }
    entries.set(entry.id, entry.bounds)
    for (const key of cellsFor(entry.bounds, options.cellSize)) {
      const bucket = mutableBuckets.get(key) ?? []
      bucket.push(entry.id)
      mutableBuckets.set(key, bucket)
    }
  }
  const buckets = new Map<string, readonly EntityId[]>()
  for (const [key, ids] of mutableBuckets) {
    buckets.set(key, Object.freeze([...ids].sort((left, right) => left - right)))
  }
  const immutableBuckets: ReadonlyMap<string, readonly EntityId[]> = buckets
  const query = (input: SpatialBounds): readonly EntityId[] => {
    const bounds = validateBounds(input)
    return Object.freeze(
      candidateIds(immutableBuckets, bounds, options.cellSize).filter((id) => intersects(entries.get(id)!, bounds))
    )
  }
  const boundsFor = (id: EntityId): SpatialBounds | undefined => entries.get(id)
  return Object.freeze({ cellSize: options.cellSize, boundsFor, query })
}
