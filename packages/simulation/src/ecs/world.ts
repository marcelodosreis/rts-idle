import type { EntityId } from '@rts/shared'
import { ComponentStore, type ComponentStoreInstrumentation } from './component-store.js'
import type { ComponentKey, ComponentType } from './components.js'

export interface WorldInstrumentation {
  readonly onAliveIdsCall?: () => void
  readonly onAliveIdsRebuild?: () => void
  readonly onQuery?: (components: readonly ComponentKey[]) => void
  readonly onQueryCandidate?: (components: readonly ComponentKey[]) => void
  readonly onComponentIdsRebuild?: () => void
}

type EntityChangeKind = 'created' | 'dirty' | 'removed'

interface EntityChange {
  readonly entityId: EntityId
  readonly kind: EntityChangeKind
}

export interface WorldChangeSet {
  readonly cursor: number
  readonly createdIds: readonly EntityId[]
  readonly dirtyIds: readonly EntityId[]
  readonly removedIds: readonly EntityId[]
}

export interface WorldOptions {
  readonly instrumentation?: WorldInstrumentation
  readonly changeHistoryLimit?: number
}

const DEFAULT_CHANGE_HISTORY_LIMIT = 1_024

export class WorldChangeCursorExpiredError extends Error {
  constructor(
    readonly cursor: number,
    readonly oldestCursor: number
  ) {
    super(`World: change cursor ${cursor} expired; oldest retained cursor is ${oldestCursor}`)
    this.name = 'WorldChangeCursorExpiredError'
  }
}

/**
 * Minimal ECS world: an alive-id set plus one {@link ComponentStore} per
 * registered component (ADR-012). Component types are registered in a fixed
 * order; serialization walks that same order, so registration order is part of
 * the canonical schema.
 */
export class World {
  private readonly entityIds = new Set<EntityId>()
  private readonly stores = new Map<string, ComponentStore<unknown>>()
  private readonly order: ComponentType<unknown>[] = []
  private readonly changeLog: EntityChange[] = []
  private readonly changeHistoryLimit: number
  private changeLogStartIndex = 0
  private changeLogStartCursor = 0
  private aliveCache: readonly EntityId[] | null = null

  public constructor(
    private readonly instrumentation: WorldInstrumentation = {},
    changeHistoryLimit = DEFAULT_CHANGE_HISTORY_LIMIT
  ) {
    if (!Number.isInteger(changeHistoryLimit) || changeHistoryLimit <= 0) {
      throw new Error(`World: invalid change history limit ${changeHistoryLimit}`)
    }
    this.changeHistoryLimit = changeHistoryLimit
  }

  registerComponent<T>(type: ComponentType<T>): void {
    if (this.stores.has(type.name)) {
      return
    }
    const storeInstrumentation: ComponentStoreInstrumentation = {
      ...(this.instrumentation.onComponentIdsRebuild === undefined
        ? {}
        : { onIdsRebuild: this.instrumentation.onComponentIdsRebuild }),
      onMutation: (entityId) => {
        this.recordChange(entityId, 'dirty')
      }
    }
    this.stores.set(type.name, new ComponentStore<T>(storeInstrumentation))
    this.order.push(type as ComponentType<unknown>)
  }

  store<T>(type: ComponentType<T>): ComponentStore<T> {
    return this.componentStore(type)
  }

  componentTypes(): readonly ComponentType<unknown>[] {
    return this.order
  }

  createEntity(entityId: EntityId): void {
    if (this.entityIds.has(entityId)) {
      throw new Error(`World: duplicate entity id ${entityId}`)
    }
    this.entityIds.add(entityId)
    this.aliveCache = null
    this.recordChange(entityId, 'created')
  }

  removeEntity(entityId: EntityId): void {
    if (this.entityIds.delete(entityId)) {
      this.aliveCache = null
      this.recordChange(entityId, 'removed')
    }
    for (const store of this.stores.values()) {
      store.delete(entityId)
    }
  }

  hasEntity(entityId: EntityId): boolean {
    return this.entityIds.has(entityId)
  }

  aliveIds(): readonly EntityId[] {
    this.instrumentation.onAliveIdsCall?.()
    if (this.aliveCache !== null) {
      return this.aliveCache
    }
    const ids = [...this.entityIds]
    ids.sort((a, b) => a - b)
    this.instrumentation.onAliveIdsRebuild?.()
    this.aliveCache = ids
    return ids
  }

  query(...components: readonly ComponentKey[]): readonly EntityId[] {
    if (components.length === 0) {
      throw new Error('World: query requires at least one component')
    }
    this.instrumentation.onQuery?.(components)
    const stores = components.map((component) => this.componentStore(component))
    const drivingStore = stores.reduce((smallest, store) => (store.size < smallest.size ? store : smallest))
    const candidates = drivingStore.ids()
    let allCandidatesAlive = true
    for (const entityId of candidates) {
      this.instrumentation.onQueryCandidate?.(components)
      if (!this.entityIds.has(entityId)) {
        allCandidatesAlive = false
      }
    }
    if (stores.length === 1 && allCandidatesAlive) {
      return candidates
    }
    const result: EntityId[] = []
    for (const entityId of candidates) {
      if (!this.entityIds.has(entityId)) {
        continue
      }
      if (stores.every((store) => store.has(entityId))) {
        result.push(entityId)
      }
    }
    return result
  }

  changeCursor(): number {
    return this.changeLogStartCursor + this.changeLog.length
  }

  changesSince(cursor: number): WorldChangeSet {
    const currentCursor = this.changeCursor()
    if (!Number.isInteger(cursor) || cursor < 0 || cursor > currentCursor) {
      throw new Error(`World: invalid change cursor ${cursor}`)
    }
    if (cursor < this.changeLogStartCursor) {
      throw new WorldChangeCursorExpiredError(cursor, this.changeLogStartCursor)
    }
    const created = new Set<EntityId>()
    const dirty = new Set<EntityId>()
    const removed = new Set<EntityId>()
    const startOffset = cursor - this.changeLogStartCursor
    for (let offset = startOffset; offset < this.changeLog.length; offset += 1) {
      const index = (this.changeLogStartIndex + offset) % this.changeHistoryLimit
      const change = this.changeLog[index]!
      if (change.kind === 'created') {
        created.add(change.entityId)
        dirty.delete(change.entityId)
        removed.delete(change.entityId)
      } else if (change.kind === 'dirty') {
        if (!created.has(change.entityId) && !removed.has(change.entityId)) {
          dirty.add(change.entityId)
        }
      } else {
        created.delete(change.entityId)
        dirty.delete(change.entityId)
        removed.add(change.entityId)
      }
    }
    return {
      cursor: currentCursor,
      createdIds: sortedIds(created),
      dirtyIds: sortedIds(dirty),
      removedIds: sortedIds(removed)
    }
  }

  markDirty(entityId: EntityId): void {
    if (this.entityIds.has(entityId)) {
      this.recordChange(entityId, 'dirty')
    }
  }

  private recordChange(entityId: EntityId, kind: EntityChangeKind): void {
    const change = { entityId, kind }
    if (this.changeLog.length < this.changeHistoryLimit) {
      this.changeLog.push(change)
      return
    }
    this.changeLog[this.changeLogStartIndex] = change
    this.changeLogStartIndex = (this.changeLogStartIndex + 1) % this.changeHistoryLimit
    this.changeLogStartCursor += 1
  }

  private componentStore<T>(type: ComponentKey): ComponentStore<T> {
    const store = this.stores.get(type.name)
    if (store === undefined) {
      throw new Error(`World: component type not registered: ${type.name}`)
    }
    return store as ComponentStore<T>
  }
}

function sortedIds(ids: Set<EntityId>): readonly EntityId[] {
  return [...ids].sort((first, second) => first - second)
}
