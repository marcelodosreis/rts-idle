import { BUILDING_TYPES, type CommandIntent } from '@rts/shared'

/** Client → server command message carrying the shared authoritative intent. */
export interface CommandMessage {
  readonly type: 'command'
  readonly intent: CommandIntent
}

function isIntegerArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'number' && Number.isInteger(entry))
}

function isInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value)
}

/** Validates the shared command intent shape on untrusted wire input. */
function isCommandIntent(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const intent = value as Record<string, unknown>
  const payload = intent.payload
  if (typeof payload !== 'object' || payload === null) {
    return false
  }
  switch (intent.type) {
    case 'MOVE': {
      const p = payload as Record<string, unknown>
      return isIntegerArray(p.unitIds) && isInteger(p.x) && isInteger(p.y)
    }
    case 'STOP':
    case 'HOLD': {
      const p = payload as Record<string, unknown>
      return isIntegerArray(p.unitIds)
    }
    case 'PATROL':
    case 'ATTACK_MOVE': {
      const p = payload as Record<string, unknown>
      return isIntegerArray(p.unitIds) && isInteger(p.x) && isInteger(p.y)
    }
    case 'ATTACK': {
      const p = payload as Record<string, unknown>
      return isIntegerArray(p.unitIds) && isInteger(p.targetId)
    }
    case 'GATHER': {
      const p = payload as Record<string, unknown>
      return isIntegerArray(p.unitIds) && isInteger(p.nodeId)
    }
    case 'DEPOSIT': {
      const p = payload as Record<string, unknown>
      return isIntegerArray(p.unitIds) && isInteger(p.buildingId)
    }
    case 'BUILD': {
      const p = payload as Record<string, unknown>
      return (
        isInteger(p.unitId) &&
        BUILDING_TYPES.includes(p.buildingType as (typeof BUILDING_TYPES)[number]) &&
        isInteger(p.x) &&
        isInteger(p.y)
      )
    }
    case 'SURRENDER':
      return Object.keys(payload).length === 0
    default:
      return false
  }
}

/** Type guard for untrusted wire input; the server ignores non-conforming messages. */
export function isCommandMessage(value: unknown): value is CommandMessage {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const message = value as Record<string, unknown>
  return message.type === 'command' && isCommandIntent(message.intent)
}
