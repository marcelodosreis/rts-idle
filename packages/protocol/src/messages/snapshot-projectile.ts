import {
  type Fixed,
  field,
  isInteger,
  isNonNegativeInteger,
  isOneOf,
  isPlayerId,
  isRecord,
  type PlayerId,
  PROJECTILE_KINDS,
  type ProjectileKind
} from '@rts/shared'

export interface SnapshotProjectile {
  readonly id: number
  readonly kind: ProjectileKind
  readonly owner: PlayerId
  readonly x: Fixed
  readonly y: Fixed
}

export function isSnapshotProjectile(value: unknown): value is SnapshotProjectile {
  return (
    isRecord(value) &&
    isNonNegativeInteger(field(value, 'id')) &&
    isOneOf(PROJECTILE_KINDS, field(value, 'kind')) &&
    isPlayerId(field(value, 'owner')) &&
    isInteger(field(value, 'x')) &&
    isInteger(field(value, 'y'))
  )
}
