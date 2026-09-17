import type { EntityId } from '@rts/shared'
import { type ComponentType, Owner, Position } from './components.js'

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

export function createWorld(): World {
  const world = new World()
  world.registerComponent(Position)
  world.registerComponent(Owner)
  return world
}
