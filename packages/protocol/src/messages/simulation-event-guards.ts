import {
  field,
  isInteger,
  isOneOf,
  isPlayerId,
  isRecord,
  MOVEMENT_BLOCK_REASONS,
  REPAIR_STOP_REASONS,
  SIMULATION_EVENT_TYPES
} from '@rts/shared'

export function isSimulationEvent(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }
  const type = field(value, 'type')
  if (!isOneOf(SIMULATION_EVENT_TYPES, type)) {
    return false
  }
  switch (type) {
    case 'attackFired':
      return isInteger(field(value, 'attackerId')) && isInteger(field(value, 'targetId'))
    case 'damageDealt':
      return (
        isInteger(field(value, 'targetId')) && isInteger(field(value, 'amount')) && isInteger(field(value, 'targetHp'))
      )
    case 'healCast':
      return (
        isInteger(field(value, 'healerId')) &&
        isInteger(field(value, 'targetId')) &&
        isInteger(field(value, 'amount')) &&
        isInteger(field(value, 'targetHp'))
      )
    case 'repairStopped':
      return (
        isInteger(field(value, 'workerId')) &&
        isInteger(field(value, 'targetId')) &&
        isOneOf(REPAIR_STOP_REASONS, field(value, 'reason'))
      )
    case 'unitDied': {
      const killerId = field(value, 'killerId')
      return (
        isInteger(field(value, 'entityId')) &&
        isPlayerId(field(value, 'owner')) &&
        (killerId === null || isInteger(killerId))
      )
    }
    case 'movementBlocked':
      return (
        isInteger(field(value, 'unitId')) &&
        isInteger(field(value, 'destinationX')) &&
        isInteger(field(value, 'destinationY')) &&
        isOneOf(MOVEMENT_BLOCK_REASONS, field(value, 'reason'))
      )
    default:
      return false
  }
}
