import {
  field,
  isInteger,
  isNonNegativeInteger,
  isOneOf,
  isPlayerId,
  isRecord,
  MOVEMENT_BLOCK_REASONS,
  PROJECTILE_EXPIRATION_REASONS,
  PROJECTILE_KINDS,
  REPAIR_STOP_REASONS,
  SIMULATION_EVENT_TYPES
} from '@rts/shared'

type UnknownObject = { [key: string]: unknown }

function isProjectileEvent(value: UnknownObject, type: string): boolean {
  const common =
    isNonNegativeInteger(field(value, 'projectileId')) &&
    isOneOf(PROJECTILE_KINDS, field(value, 'kind')) &&
    isInteger(field(value, 'x')) &&
    isInteger(field(value, 'y'))
  if (type === 'projectileExpired') {
    return common && isOneOf(PROJECTILE_EXPIRATION_REASONS, field(value, 'reason'))
  }
  if (type === 'projectileLaunched') {
    return common && isPlayerId(field(value, 'owner'))
  }
  return common
}

function isAreaDamageEvent(value: UnknownObject): boolean {
  return (
    isNonNegativeInteger(field(value, 'projectileId')) &&
    isOneOf(PROJECTILE_KINDS, field(value, 'kind')) &&
    isInteger(field(value, 'x')) &&
    isInteger(field(value, 'y')) &&
    isNonNegativeInteger(field(value, 'innerRadius')) &&
    isNonNegativeInteger(field(value, 'totalRadius'))
  )
}

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
    case 'projectileImpacted':
    case 'projectileLaunched':
    case 'projectileExpired':
      return isProjectileEvent(value, type)
    case 'areaDamageImpacted':
      return isAreaDamageEvent(value)
    default:
      return false
  }
}
