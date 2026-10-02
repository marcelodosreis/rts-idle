import type { EntityId } from '@rts/shared'

export interface ComponentStoreInstrumentation {
  readonly onIdsRebuild?: () => void
  readonly onMutation?: (entityId: EntityId) => void
}

const INSTRUMENTATIONS = new WeakMap<object, ComponentStoreInstrumentation>()

/**
 * Dense per-component storage keyed by EntityId.
 * Component values are plain data (no behavior); hot components may move to
 * dense typed arrays later without changing semantics (ADR-012).
 */
export class ComponentStore<T> {
  private readonly data = new Map<EntityId, T>()
  private idsCache: readonly EntityId[] | null = null

  public constructor(instrumentation: ComponentStoreInstrumentation = {}) {
    INSTRUMENTATIONS.set(this, instrumentation)
  }

  set(entityId: EntityId, value: T): void {
    const previous = this.data.get(entityId)
    if (previous !== undefined && valuesEqual(previous, value)) {
      return
    }
    const membershipChanged = !this.data.has(entityId)
    this.data.set(entityId, value)
    this.instrumentation.onMutation?.(entityId)
    if (membershipChanged) {
      this.idsCache = null
    }
  }

  get(entityId: EntityId): T | undefined {
    return this.data.get(entityId)
  }

  has(entityId: EntityId): boolean {
    return this.data.has(entityId)
  }

  delete(entityId: EntityId): void {
    if (this.data.delete(entityId)) {
      this.instrumentation.onMutation?.(entityId)
      this.idsCache = null
    }
  }

  get size(): number {
    return this.data.size
  }

  ids(): readonly EntityId[] {
    if (this.idsCache !== null) {
      return this.idsCache
    }
    const ids = [...this.data.keys()]
    ids.sort((a, b) => a - b)
    this.instrumentation.onIdsRebuild?.()
    this.idsCache = ids
    return ids
  }

  private get instrumentation(): ComponentStoreInstrumentation {
    return INSTRUMENTATIONS.get(this)!
  }
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => valuesEqual(value, right[index]))
    )
  }
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') {
    return false
  }
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => Object.hasOwn(right, key) && valuesEqual(Reflect.get(left, key), Reflect.get(right, key)))
  )
}
