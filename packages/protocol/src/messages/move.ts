import type { EntityId, Fixed } from '@rts/shared'

/**
 * Client → server order to move units to an integer fixed-unit target.
 * Coordinates are validated as integers (fixed units), not tiles.
 */
export interface MoveMessage {
  readonly type: 'MOVE'
  readonly unitIds: readonly EntityId[]
  readonly x: Fixed
  readonly y: Fixed
}

/** Type guard for untrusted wire input; the server rejects non-conforming messages. */
export function isMoveMessage(value: unknown): value is MoveMessage {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const message = value as Record<string, unknown>
  return (
    message.type === 'MOVE' &&
    Array.isArray(message.unitIds) &&
    message.unitIds.every((id) => typeof id === 'number' && Number.isInteger(id)) &&
    typeof message.x === 'number' &&
    Number.isInteger(message.x) &&
    typeof message.y === 'number' &&
    Number.isInteger(message.y)
  )
}
