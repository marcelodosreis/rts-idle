import {
  BUILDING_TYPES,
  type CommandIntent,
  field,
  isInteger,
  isOneOf,
  isRecord,
  RESEARCH_TYPES,
  TRAINABLE_UNIT_KINDS
} from '@rts/shared'

/** Client → server command message carrying the shared authoritative intent. */
export interface CommandMessage {
  readonly type: 'command'
  readonly intent: CommandIntent
}

function isIntegerArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isInteger)
}

function payloadOf(intent: Record<string, unknown>): Record<string, unknown> | null {
  const payload = field(intent, 'payload')
  return isRecord(payload) ? payload : null
}

function isBuildIntent(payload: Record<string, unknown>): boolean {
  return (
    isInteger(field(payload, 'unitId')) &&
    BUILDING_TYPES.includes(field(payload, 'buildingType') as (typeof BUILDING_TYPES)[number]) &&
    isInteger(field(payload, 'x')) &&
    isInteger(field(payload, 'y'))
  )
}

function isTrainIntent(payload: Record<string, unknown>): boolean {
  return (
    isInteger(field(payload, 'producerId')) &&
    TRAINABLE_UNIT_KINDS.includes(field(payload, 'unitKind') as (typeof TRAINABLE_UNIT_KINDS)[number])
  )
}

/** Validates the shared command intent shape on untrusted wire input. */
function isCommandIntent(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }
  const payload = payloadOf(value)
  if (payload === null) {
    return false
  }
  switch (field(value, 'type')) {
    case 'MOVE':
    case 'PATROL':
    case 'ATTACK_MOVE':
      return (
        isIntegerArray(field(payload, 'unitIds')) && isInteger(field(payload, 'x')) && isInteger(field(payload, 'y'))
      )
    case 'STOP':
    case 'HOLD':
      return isIntegerArray(field(payload, 'unitIds'))
    case 'ATTACK':
      return isIntegerArray(field(payload, 'unitIds')) && isInteger(field(payload, 'targetId'))
    case 'GATHER':
      return isIntegerArray(field(payload, 'unitIds')) && isInteger(field(payload, 'nodeId'))
    case 'DEPOSIT':
      return isIntegerArray(field(payload, 'unitIds')) && isInteger(field(payload, 'buildingId'))
    case 'REPAIR':
      return isIntegerArray(field(payload, 'unitIds')) && isInteger(field(payload, 'targetId'))
    case 'HEAL':
      return isIntegerArray(field(payload, 'unitIds')) && isInteger(field(payload, 'targetId'))
    case 'BUILD':
      return isBuildIntent(payload)
    case 'CANCEL_CONSTRUCTION':
      return isInteger(field(payload, 'buildingId'))
    case 'UPGRADE_CASTLE':
      return isInteger(field(payload, 'castleId'))
    case 'CANCEL_PRODUCTION':
      return isInteger(field(payload, 'producerId')) && isInteger(field(payload, 'queueIndex'))
    case 'RESEARCH':
      return isInteger(field(payload, 'monasteryId')) && isOneOf(RESEARCH_TYPES, field(payload, 'researchType'))
    case 'CANCEL_RESEARCH':
      return isInteger(field(payload, 'monasteryId')) && isInteger(field(payload, 'queueIndex'))
    case 'TRAIN':
      return isTrainIntent(payload)
    case 'RALLY':
      return isInteger(field(payload, 'producerId')) && isInteger(field(payload, 'x')) && isInteger(field(payload, 'y'))
    case 'SURRENDER':
      return Object.keys(payload).length === 0
    default:
      return false
  }
}

/** Type guard for untrusted wire input; the server ignores non-conforming messages. */
export function isCommandMessage(value: unknown): value is CommandMessage {
  return isRecord(value) && field(value, 'type') === 'command' && isCommandIntent(field(value, 'intent'))
}
