import type { EntityId } from '@rts/shared'

/**
 * Dense per-component storage keyed by EntityId.
 * Component values are plain data (no behavior); hot components may move to
 * dense typed arrays later without changing semantics (ADR-012).
 */
export class ComponentStore<T> {
  private readonly data = new Map<EntityId, T>()

  set(entityId: EntityId, value: T): void {
    this.data.set(entityId, value)
  }

  get(entityId: EntityId): T | undefined {
    return this.data.get(entityId)
  }

  has(entityId: EntityId): boolean {
    return this.data.has(entityId)
  }

  delete(entityId: EntityId): void {
    this.data.delete(entityId)
  }

  clear(): void {
    this.data.clear()
  }

  entries(): ReadonlyMap<EntityId, T> {
    return this.data
  }
}
