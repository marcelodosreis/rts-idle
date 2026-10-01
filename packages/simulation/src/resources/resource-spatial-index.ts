import { resourceTypeForKind } from '@rts/shared'
import type { ResourceCatalog, ResourceCatalogEntry, ResourceSearch } from './resource-catalog.js'

const RESOURCE_SPATIAL_CELL_FIXED = 2_048

function cellCoordinate(value: number): number {
  return Math.floor(value / RESOURCE_SPATIAL_CELL_FIXED)
}

function resourceCellKey(x: number, y: number): string {
  return `${cellCoordinate(x)},${cellCoordinate(y)}`
}

function candidateIsCloser(
  candidate: ResourceCatalogEntry,
  x: number,
  y: number,
  current: ResourceCatalogEntry | null,
  currentDistance: number
): boolean {
  const dx = candidate.x - x
  const dy = candidate.y - y
  const distance = dx * dx + dy * dy
  return (
    distance < currentDistance ||
    (distance === currentDistance && (current === null || candidate.resourceId < current.resourceId))
  )
}

/** Active-only deterministic spatial buckets for map resources. */
export class ResourceSpatialIndex {
  private readonly activeIndexesByCell = new Map<string, number[]>()
  private readonly cellBounds: {
    readonly minX: number
    readonly maxX: number
    readonly minY: number
    readonly maxY: number
  } | null

  constructor(
    private readonly catalog: ResourceCatalog,
    remaining?: Int32Array
  ) {
    const buckets = new Map<string, number[]>()
    for (const definition of catalog.definitions()) {
      if (remaining !== undefined && remaining[definition.index] === 0) {
        continue
      }
      const key = resourceCellKey(definition.x, definition.y)
      const bucket = buckets.get(key) ?? []
      bucket.push(definition.index)
      buckets.set(key, bucket)
    }
    for (const [key, indexes] of buckets) {
      this.activeIndexesByCell.set(key, indexes)
    }
    this.cellBounds = boundsForCells(this.activeIndexesByCell.keys())
  }

  remove(resourceId: number): void {
    const definition = this.catalog.entry(resourceId)
    if (definition === undefined) {
      return
    }
    const key = resourceCellKey(definition.x, definition.y)
    const active = this.activeIndexesByCell.get(key)
    if (active === undefined) {
      return
    }
    const index = active.indexOf(definition.index)
    if (index >= 0) {
      active.splice(index, 1)
    }
    if (active.length === 0) {
      this.activeIndexesByCell.delete(key)
    }
  }

  findNearest(search: ResourceSearch): ResourceCatalogEntry | null {
    let nearest: ResourceCatalogEntry | null = null
    let nearestDistance = Number.POSITIVE_INFINITY
    const cellX = cellCoordinate(search.x)
    const cellY = cellCoordinate(search.y)
    let radius = 0
    const maxRadius = this.maximumCellRadius(cellX, cellY)
    while (radius <= maxRadius) {
      this.visitRing(cellX, cellY, radius, (index) => {
        const entry = this.catalog.entryAt(index)
        if (
          entry === undefined ||
          (search.kind !== undefined && entry.kind !== search.kind) ||
          (search.resourceType !== undefined && resourceTypeForKind(entry.kind) !== search.resourceType)
        ) {
          return
        }
        if (candidateIsCloser(entry, search.x, search.y, nearest, nearestDistance)) {
          const dx = entry.x - search.x
          const dy = entry.y - search.y
          nearestDistance = dx * dx + dy * dy
          nearest = entry
        }
      })
      if (nearest !== null && this.ringCannotImprove(radius, nearestDistance)) {
        break
      }
      radius += 1
    }
    return nearest
  }

  private maximumCellRadius(x: number, y: number): number {
    if (this.cellBounds === null) {
      return 0
    }
    return Math.max(
      Math.abs(this.cellBounds.minX - x),
      Math.abs(this.cellBounds.maxX - x),
      Math.abs(this.cellBounds.minY - y),
      Math.abs(this.cellBounds.maxY - y)
    )
  }

  private ringCannotImprove(radius: number, nearestDistance: number): boolean {
    const minimumOutsideDistance = radius * RESOURCE_SPATIAL_CELL_FIXED
    return minimumOutsideDistance * minimumOutsideDistance > nearestDistance
  }

  private visitRing(cellX: number, cellY: number, radius: number, visit: (index: number) => void): void {
    for (let y = cellY - radius; y <= cellY + radius; y += 1) {
      for (let x = cellX - radius; x <= cellX + radius; x += 1) {
        if (
          radius > 0 &&
          x !== cellX - radius &&
          x !== cellX + radius &&
          y !== cellY - radius &&
          y !== cellY + radius
        ) {
          continue
        }
        for (const index of this.activeIndexesByCell.get(`${x},${y}`) ?? []) {
          visit(index)
        }
      }
    }
  }
}

function boundsForCells(
  keys: Iterable<string>
): { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number } | null {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const key of keys) {
    const [xText, yText] = key.split(',')
    const x = Number(xText)
    const y = Number(yText)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return Number.isFinite(minX) ? { minX, maxX, minY, maxY } : null
}
