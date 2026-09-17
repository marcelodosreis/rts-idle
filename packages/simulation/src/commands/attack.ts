import type { AttackPayload, ScheduledCommand } from '../contracts/commands.js'
import { CommandRejectedError } from '../contracts/commands.js'
import { OrderQueue, Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { requireAlive, requireRunning, validateOwnedSelection } from './validate.js'

/**
 * Applies an ATTACK command: issues a directed ATTACK order on the visible
 * enemy target (master plan §10.1). The combat system fires when in range.
 * A target that is not a live enemy is rejected (TARGET_UNAVAILABLE); hidden
 * and nonexistent targets are deliberately indistinguishable (§10.5).
 */
export function applyAttack(state: GameState, command: ScheduledCommand, payload: AttackPayload): void {
  requireRunning(state, command)
  requireAlive(state, command)
  validateOwnedSelection(state, command, payload.unitIds)

  const owners = state.world.store(Owner)
  if (!state.world.hasEntity(payload.targetId)) {
    throw new CommandRejectedError('TARGET_UNAVAILABLE', command, `ATTACK: target ${payload.targetId} does not exist`)
  }
  const targetOwner = owners.get(payload.targetId)
  if (targetOwner === undefined || targetOwner.owner === command.playerId) {
    throw new CommandRejectedError(
      'TARGET_UNAVAILABLE',
      command,
      `ATTACK: target ${payload.targetId} is not a valid enemy`
    )
  }

  const queues = state.world.store(OrderQueue)
  for (const unitId of payload.unitIds) {
    const order = { type: 'ATTACK' as const, targetId: payload.targetId }
    const existing = queues.get(unitId)
    if (payload.mode === 'append' && existing !== undefined) {
      queues.set(unitId, { orders: [...existing.orders, order] })
    } else {
      queues.set(unitId, { orders: [order] })
    }
  }
}
