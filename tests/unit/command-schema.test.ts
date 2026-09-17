import { type CommandIntent, CommandRejectedError, type ScheduledCommand } from '@rts/simulation'
import { everyCommandType, validateCommandShape } from '@rts/simulation/commands/schema.js'
import { describe, expect, it } from 'vitest'

function command(intent: CommandIntent): ScheduledCommand {
  return { tick: 1, playerId: 0, sequence: 1, intent }
}

function validIntent(type: CommandIntent['type']): CommandIntent {
  switch (type) {
    case 'MOVE':
      return { type, payload: { unitIds: [1, 2], x: 256, y: 256 } }
    case 'ATTACK':
      return { type, payload: { unitIds: [1], targetId: 9 } }
    case 'ATTACK_MOVE':
      return { type, payload: { unitIds: [1], x: 256, y: 256 } }
    case 'STOP':
      return { type, payload: { unitIds: [1] } }
    case 'HOLD':
      return { type, payload: { unitIds: [1] } }
    case 'PATROL':
      return { type, payload: { unitIds: [1], x1: 0, y1: 0, x2: 256, y2: 256 } }
    case 'GATHER':
      return { type, payload: { workerIds: [1], resourceId: 99 } }
    case 'RETURN_CARGO':
      return { type, payload: { workerIds: [1] } }
    case 'BUILD':
      return { type, payload: { workerId: 1, definitionId: 'base', tileX: 8, tileY: 8 } }
    case 'TRAIN':
      return { type, payload: { producerId: 1, unitDefinitionId: 'worker' } }
    case 'RESEARCH':
      return { type, payload: { laboratoryId: 1, researchId: 'attack' } }
    case 'RALLY':
      return { type, payload: { producerId: 1, x: 256, y: 256 } }
    case 'REPAIR':
      return { type, payload: { workerIds: [1], targetId: 9 } }
    case 'CANCEL_CONSTRUCTION':
      return { type, payload: { foundationId: 1 } }
    case 'CANCEL_PRODUCTION':
      return { type, payload: { producerId: 1, queueIndex: 0 } }
    case 'CANCEL_RESEARCH':
      return { type, payload: { laboratoryId: 1 } }
    case 'USE_ABILITY':
      return { type, payload: { unitId: 1, abilityId: 'brace' } }
    case 'SURRENDER':
      return { type, payload: {} }
  }
}

describe('command schema', () => {
  it('covers every command type in the union', () => {
    expect(everyCommandType()).toHaveLength(18)
    for (const type of everyCommandType()) {
      expect(() => validateCommandShape(command(validIntent(type)))).not.toThrow()
    }
  })

  it('rejects duplicate entity ids in a selection', () => {
    expect(() => validateCommandShape(command({ type: 'MOVE', payload: { unitIds: [1, 1], x: 0, y: 0 } }))).toThrow(
      CommandRejectedError
    )
  })

  it('rejects empty and oversized selections', () => {
    expect(() => validateCommandShape(command({ type: 'MOVE', payload: { unitIds: [], x: 0, y: 0 } }))).toThrow(
      CommandRejectedError
    )
    expect(() =>
      validateCommandShape(
        command({ type: 'MOVE', payload: { unitIds: Array.from({ length: 257 }, (_, i) => i + 1), x: 0, y: 0 } })
      )
    ).toThrow(CommandRejectedError)
  })

  it('rejects fractional coordinates', () => {
    expect(() => validateCommandShape(command({ type: 'MOVE', payload: { unitIds: [1], x: 1.5, y: 0 } }))).toThrow(
      CommandRejectedError
    )
  })

  it('rejects invalid order modes', () => {
    const intent = { type: 'MOVE' as const, payload: { unitIds: [1], x: 0, y: 0, mode: 'stack' as never } }
    expect(() => validateCommandShape(command(intent))).toThrow(CommandRejectedError)
  })

  it('rejects invalid single-entity command shapes', () => {
    expect(() =>
      validateCommandShape(
        command({ type: 'BUILD', payload: { workerId: 1.5, definitionId: 'base', tileX: 0, tileY: 0 } })
      )
    ).toThrow(CommandRejectedError)
    expect(() =>
      validateCommandShape(command({ type: 'CANCEL_PRODUCTION', payload: { producerId: 1, queueIndex: -1 } }))
    ).toThrow(CommandRejectedError)
  })

  it('produces INVALID_PAYLOAD with the offending command attached', () => {
    let caught: CommandRejectedError | null = null
    try {
      validateCommandShape(command({ type: 'MOVE', payload: { unitIds: [1, 1], x: 0, y: 0 } }))
    } catch (error) {
      caught = error instanceof CommandRejectedError ? error : null
    }
    expect(caught?.code).toBe('INVALID_PAYLOAD')
    expect(caught?.command.intent.type).toBe('MOVE')
  })
})
