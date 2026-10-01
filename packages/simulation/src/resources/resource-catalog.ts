import type { ResourceDefinition, ResourceId, ResourceKind, ResourceType } from '@rts/shared'

export interface ResourceSearch {
  readonly x: number
  readonly y: number
  readonly kind?: ResourceKind
  readonly resourceType?: ResourceType
}

export interface ResourceCatalogEntry extends ResourceDefinition {
  readonly index: number
}

/** Immutable, map-local resource definitions in canonical id order. */
export class ResourceCatalog {
  private readonly entries: readonly ResourceCatalogEntry[]
  private readonly indexesById = new Map<ResourceId, number>()

  constructor(definitions: readonly ResourceDefinition[] = []) {
    const sorted = [...definitions].sort((left, right) => left.resourceId - right.resourceId)
    this.entries = sorted.map((definition, index) => ({ ...definition, index }))
    for (const entry of this.entries) {
      if (this.indexesById.has(entry.resourceId)) {
        throw new Error(`ResourceCatalog: duplicate resource id ${entry.resourceId}`)
      }
      this.indexesById.set(entry.resourceId, entry.index)
    }
  }

  definitions(): readonly ResourceCatalogEntry[] {
    return this.entries
  }

  entry(resourceId: ResourceId): ResourceCatalogEntry | undefined {
    const index = this.indexesById.get(resourceId)
    return index === undefined ? undefined : this.entries[index]
  }

  entryAt(index: number): ResourceCatalogEntry | undefined {
    return this.entries[index]
  }

  size(): number {
    return this.entries.length
  }
}
