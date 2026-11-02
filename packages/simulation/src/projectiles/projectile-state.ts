import type { EntityId, Fixed, PlayerId, ProjectileKind } from '@rts/shared'

export interface ProjectileState {
  readonly id: number
  readonly kind: ProjectileKind
  readonly owner: PlayerId
  readonly sourceId: EntityId
  readonly targetId: EntityId
  readonly x: Fixed
  readonly y: Fixed
  readonly lastKnownX: Fixed
  readonly lastKnownY: Fixed
  readonly damage: number
  readonly remainingTtl: number
  readonly movementRemainder: number
}

export interface ProjectileStore {
  nextId: number
  active: Map<number, ProjectileState>
}

export function createProjectileStore(): ProjectileStore {
  return { nextId: 1, active: new Map() }
}

export function cloneProjectileStore(store: ProjectileStore): ProjectileStore {
  return {
    nextId: store.nextId,
    active: new Map([...store.active].map(([id, projectile]) => [id, { ...projectile }]))
  }
}
