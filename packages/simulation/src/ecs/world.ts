import type { EntityId } from '@rts/shared'
import { ComponentStore } from './component-store.js'
import type { ComponentType } from './components.js'

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

  registerComponent<T>(type: ComponentType<T>): void {
    if (this.stores.has(type.name)) {
      return
    }
    this.stores.set(type.name, new ComponentStore<T>())
    this.order.push(type as ComponentType<unknown>)
  }

  store<T>(type: ComponentType<T>): ComponentStore<T> {
    const store = this.stores.get(type.name)
    if (store === undefined) {
      throw new Error(`World: component type not registered: ${type.name}`)
    }
    return store as ComponentStore<T>
  }

  componentTypes(): readonly ComponentType<unknown>[] {
    return this.order
  }

  createEntity(entityId: EntityId): void {
    if (this.entityIds.has(entityId)) {
      throw new Error(`World: duplicate entity id ${entityId}`)
    }
    this.entityIds.add(entityId)
  }

  removeEntity(entityId: EntityId): void {
    this.entityIds.delete(entityId)
    for (const store of this.stores.values()) {
      store.delete(entityId)
    }
  }

  hasEntity(entityId: EntityId): boolean {
    return this.entityIds.has(entityId)
  }

  aliveIds(): EntityId[] {
    const ids = [...this.entityIds]
    ids.sort((a, b) => a - b)
    return ids
  }
}
