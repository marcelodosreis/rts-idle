import type { EntityId } from '@rts/shared'
import {
  type CommandIntent,
  CommandRejectedError,
  type OrderMode,
  type ScheduledCommand
} from '../contracts/commands.js'
import { MAX_UNITS_PER_COMMAND } from './limits.js'

function isInteger(value: number): boolean {
  return Number.isInteger(value)
}

function isNonEmptyString(value: string): boolean {
  return typeof value === 'string' && value.length > 0
}

function validMode(mode: OrderMode | undefined): boolean {
  return mode === undefined || mode === 'replace' || mode === 'append'
}

/** Validates the selection list shape: non-empty, within limit, no duplicates. */
function validateSelection(command: ScheduledCommand, ids: readonly EntityId[], label: string): void {
  if (ids.length === 0 || ids.length > MAX_UNITS_PER_COMMAND) {
    throw new CommandRejectedError(
      'INVALID_PAYLOAD',
      command,
      `${label}: selection count ${ids.length} outside [1, ${MAX_UNITS_PER_COMMAND}]`
    )
  }
  const seen = new Set<EntityId>()
  for (const id of ids) {
    if (!Number.isInteger(id)) {
      throw new CommandRejectedError('INVALID_PAYLOAD', command, `${label}: non-integer entity id ${id}`)
    }
    if (seen.has(id)) {
      throw new CommandRejectedError('INVALID_PAYLOAD', command, `${label}: duplicate entity id ${id}`)
    }
    seen.add(id)
  }
}

function requireInteger(command: ScheduledCommand, value: number, label: string): void {
  if (!isInteger(value)) {
    throw new CommandRejectedError('INVALID_PAYLOAD', command, `${label}: expected an integer, got ${value}`)
  }
}

function requireMode(command: ScheduledCommand, mode: OrderMode | undefined): void {
  if (!validMode(mode)) {
    throw new CommandRejectedError('INVALID_PAYLOAD', command, `mode: expected replace or append, got ${String(mode)}`)
  }
}

/**
 * Validates the structural shape of a command's payload (counts, integer
 * fields, duplicates, modes) without any world context. Context validation
 * (ownership, existence, availability) lives in the per-type apply handlers
 * (task A3). Throws {@link CommandRejectedError} on the first violation.
 */
export function validateCommandShape(command: ScheduledCommand): void {
  const { type, payload } = command.intent
  switch (type) {
    case 'MOVE':
      requireMode(command, payload.mode)
      requireInteger(command, payload.x, 'MOVE.x')
      requireInteger(command, payload.y, 'MOVE.y')
      validateSelection(command, payload.unitIds, 'MOVE')
      return
    case 'ATTACK':
      requireMode(command, payload.mode)
      requireInteger(command, payload.targetId, 'ATTACK.targetId')
      validateSelection(command, payload.unitIds, 'ATTACK')
      return
    case 'ATTACK_MOVE':
      requireMode(command, payload.mode)
      requireInteger(command, payload.x, 'ATTACK_MOVE.x')
      requireInteger(command, payload.y, 'ATTACK_MOVE.y')
      validateSelection(command, payload.unitIds, 'ATTACK_MOVE')
      return
    case 'STOP':
      validateSelection(command, payload.unitIds, 'STOP')
      return
    case 'HOLD':
      validateSelection(command, payload.unitIds, 'HOLD')
      return
    case 'PATROL':
      requireMode(command, payload.mode)
      requireInteger(command, payload.x1, 'PATROL.x1')
      requireInteger(command, payload.y1, 'PATROL.y1')
      requireInteger(command, payload.x2, 'PATROL.x2')
      requireInteger(command, payload.y2, 'PATROL.y2')
      validateSelection(command, payload.unitIds, 'PATROL')
      return
    case 'GATHER':
      requireMode(command, payload.mode)
      requireInteger(command, payload.resourceId, 'GATHER.resourceId')
      validateSelection(command, payload.workerIds, 'GATHER')
      return
    case 'RETURN_CARGO':
      validateSelection(command, payload.workerIds, 'RETURN_CARGO')
      return
    case 'BUILD':
      requireInteger(command, payload.workerId, 'BUILD.workerId')
      requireInteger(command, payload.tileX, 'BUILD.tileX')
      requireInteger(command, payload.tileY, 'BUILD.tileY')
      if (!isNonEmptyString(payload.definitionId)) {
        throw new CommandRejectedError('INVALID_PAYLOAD', command, 'BUILD: definitionId must be a non-empty string')
      }
      return
    case 'TRAIN':
      requireInteger(command, payload.producerId, 'TRAIN.producerId')
      if (!isNonEmptyString(payload.unitDefinitionId)) {
        throw new CommandRejectedError('INVALID_PAYLOAD', command, 'TRAIN: unitDefinitionId must be a non-empty string')
      }
      return
    case 'RESEARCH':
      requireInteger(command, payload.laboratoryId, 'RESEARCH.laboratoryId')
      if (!isNonEmptyString(payload.researchId)) {
        throw new CommandRejectedError('INVALID_PAYLOAD', command, 'RESEARCH: researchId must be a non-empty string')
      }
      return
    case 'RALLY':
      requireInteger(command, payload.producerId, 'RALLY.producerId')
      requireInteger(command, payload.x, 'RALLY.x')
      requireInteger(command, payload.y, 'RALLY.y')
      return
    case 'REPAIR':
      requireMode(command, payload.mode)
      requireInteger(command, payload.targetId, 'REPAIR.targetId')
      validateSelection(command, payload.workerIds, 'REPAIR')
      return
    case 'CANCEL_CONSTRUCTION':
      requireInteger(command, payload.foundationId, 'CANCEL_CONSTRUCTION.foundationId')
      return
    case 'CANCEL_PRODUCTION':
      requireInteger(command, payload.producerId, 'CANCEL_PRODUCTION.producerId')
      if (!isInteger(payload.queueIndex) || payload.queueIndex < 0) {
        throw new CommandRejectedError(
          'INVALID_PAYLOAD',
          command,
          `CANCEL_PRODUCTION: queueIndex must be a non-negative integer, got ${payload.queueIndex}`
        )
      }
      return
    case 'CANCEL_RESEARCH':
      requireInteger(command, payload.laboratoryId, 'CANCEL_RESEARCH.laboratoryId')
      return
    case 'USE_ABILITY':
      requireInteger(command, payload.unitId, 'USE_ABILITY.unitId')
      if (!isNonEmptyString(payload.abilityId)) {
        throw new CommandRejectedError('INVALID_PAYLOAD', command, 'USE_ABILITY: abilityId must be a non-empty string')
      }
      if (payload.targetId !== undefined) {
        requireInteger(command, payload.targetId, 'USE_ABILITY.targetId')
      }
      return
    case 'SURRENDER':
      return
  }
}

/** Exhaustive enumeration of the command union (schema test helper). */
export function everyCommandType(): CommandIntent['type'][] {
  return [
    'MOVE',
    'ATTACK',
    'ATTACK_MOVE',
    'STOP',
    'HOLD',
    'PATROL',
    'GATHER',
    'RETURN_CARGO',
    'BUILD',
    'TRAIN',
    'RESEARCH',
    'RALLY',
    'REPAIR',
    'CANCEL_CONSTRUCTION',
    'CANCEL_PRODUCTION',
    'CANCEL_RESEARCH',
    'USE_ABILITY',
    'SURRENDER'
  ]
}
