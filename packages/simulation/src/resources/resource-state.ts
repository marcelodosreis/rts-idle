import { isInt32, isUint32, type ResourceDefinition, type ResourceId } from '@rts/shared'
import { ResourceCatalog, type ResourceCatalogEntry, type ResourceSearch } from './resource-catalog.js'
import { ResourceSpatialIndex } from './resource-spatial-index.js'

/** Mutable amount for one catalog resource; the value type of every delta. */
export interface ResourceAmount {
  readonly resourceId: ResourceId
  readonly remaining: number
}

/**
 * Compact mutable amounts for the immutable resource catalog. Change discovery
 * is O(changed): `harvest` records ids in `changedResourceIds`, so a tick with
 * 50k static resources reports an empty delta without scanning the catalog.
 */
export class ResourceState {
  readonly remaining: Int32Array
  readonly changedResourceIds: number[]
  private spatialIndex: ResourceSpatialIndex | null = null

  constructor(
    readonly catalog: ResourceCatalog,
    remaining?: Int32Array,
    changedResourceIds: readonly ResourceId[] = []
  ) {
    if (remaining === undefined) {
      // Fresh state: validate authored definitions once. Restores and clones
      // pass known-good amounts and skip the O(total) definition pass.
      for (const definition of catalog.definitions()) {
        if (
          !isUint32(definition.resourceId) ||
          !isInt32(definition.x) ||
          !isInt32(definition.y) ||
          !isInt32(definition.variant) ||
          !isInt32(definition.initialAmount) ||
          !isInt32(definition.harvestAmount) ||
          !isInt32(definition.harvestTicks) ||
          definition.initialAmount < 0 ||
          definition.harvestAmount <= 0 ||
          definition.harvestTicks <= 0 ||
          definition.initialAmount < definition.harvestAmount
        ) {
          throw new Error(`ResourceState: invalid definition for resource ${definition.resourceId}`)
        }
      }
      this.remaining = Int32Array.from(catalog.definitions(), (entry) => entry.initialAmount)
    } else {
      this.remaining = remaining
    }
    if (this.remaining.length !== catalog.size()) {
      throw new Error('ResourceState: compact state does not match catalog size')
    }
    this.changedResourceIds = [...changedResourceIds]
  }

  /** Independent copy sharing the immutable catalog; used for observations. */
  clone(): ResourceState {
    return new ResourceState(this.catalog, this.remaining.slice(), this.changedResourceIds)
  }

  beginTick(): void {
    this.changedResourceIds.length = 0
  }

  amount(resourceId: ResourceId): number | undefined {
    const entry = this.catalog.entry(resourceId)
    return entry === undefined ? undefined : this.remaining[entry.index]
  }

  isAvailable(resourceId: ResourceId): boolean {
    return (this.amount(resourceId) ?? 0) > 0
  }

  harvest(resourceId: ResourceId, amount: number): number {
    const entry = this.catalog.entry(resourceId)
    if (entry === undefined || amount <= 0) {
      return 0
    }
    const remaining = this.remaining[entry.index]!
    if (remaining < amount) {
      return 0
    }
    const next = remaining - amount
    this.remaining[entry.index] = next
    if (!this.changedResourceIds.includes(resourceId)) {
      this.changedResourceIds.push(resourceId)
    }
    if (next === 0) {
      this.index().remove(resourceId)
    }
    return amount
  }

  changed(): readonly ResourceAmount[] {
    return this.changedResourceIds.map((resourceId) => ({ resourceId, remaining: this.amount(resourceId)! }))
  }

  all(): readonly ResourceAmount[] {
    return this.catalog
      .definitions()
      .map((entry) => ({ resourceId: entry.resourceId, remaining: this.remaining[entry.index]! }))
  }

  findNearest(search: ResourceSearch): ResourceCatalogEntry | null {
    return this.index().findNearest(search)
  }

  private index(): ResourceSpatialIndex {
    this.spatialIndex ??= new ResourceSpatialIndex(this.catalog, this.remaining)
    return this.spatialIndex
  }
}

/** Builds compact state for map-authored definitions (used by `createSimulation`). */
export function createResourceState(definitions: readonly ResourceDefinition[] = []): ResourceState {
  return new ResourceState(new ResourceCatalog(definitions))
}
