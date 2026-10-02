import { isNonNegativeInteger } from '@rts/shared'

export function isSnapshotViewSequence(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0
}

export function isSnapshotViewHash(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}
