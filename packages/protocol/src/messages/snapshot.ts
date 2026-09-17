import type { EntityId, Fixed, PlayerId } from '@rts/shared'

/** A unit as projected on the wire: position in integer fixed units and owner slot. */
export interface SnapshotUnit {
  readonly id: EntityId
  readonly x: Fixed
  readonly y: Fixed
  readonly owner: PlayerId
}

/** Server → client view of a completed tick. */
export interface SnapshotMessage {
  readonly type: 'snapshot'
  readonly tick: number
  readonly units: readonly SnapshotUnit[]
}

function isSnapshotUnit(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const unit = value as Record<string, unknown>
  const id = unit.id
  const x = unit.x
  const y = unit.y
  const owner = unit.owner
  if (typeof id !== 'number' || !Number.isInteger(id)) {
    return false
  }
  if (typeof x !== 'number' || !Number.isInteger(x)) {
    return false
  }
  if (typeof y !== 'number' || !Number.isInteger(y)) {
    return false
  }
  if (typeof owner !== 'number' || !Number.isInteger(owner)) {
    return false
  }
  return owner >= 0 && owner <= 3
}

/** Type guard for untrusted wire input; the client ignores non-conforming messages. */
export function isSnapshotMessage(value: unknown): value is SnapshotMessage {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const message = value as Record<string, unknown>
  return (
    message.type === 'snapshot' &&
    Number.isInteger(message.tick) &&
    Array.isArray(message.units) &&
    message.units.every(isSnapshotUnit)
  )
}
