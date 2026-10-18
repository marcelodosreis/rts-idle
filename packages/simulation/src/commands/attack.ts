import type { ScheduledCommand } from '../contracts/commands.js'
import { CommandRejectedError } from '../contracts/commands.js'
import { AttackTarget } from '../ecs/attack-target-component.js'
import { Owner } from '../ecs/components.js'
import { clearMovement } from '../movement/destination.js'
import { setOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'
import { isEntityVisible } from '../vision/vision-state.js'
import { validateAttackCapableUnits } from './validate-units.js'

/**
 * ATTACK orders the selected units to acquire and attack a specific target.
 * The combat system chases and fires at the target; the order resolves when
 * the target dies. Rejected when the target is missing or belongs to the same
 * player.
 */
export function applyAttack(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'ATTACK') {
    throw new Error('applyAttack: expected an ATTACK command')
  }
  const payload = command.intent.payload
  validateAttackCapableUnits(state, command, payload.unitIds)
  if (!state.world.hasEntity(payload.targetId)) {
    throw new CommandRejectedError('ENTITY_UNAVAILABLE', command, `ATTACK: target ${payload.targetId} does not exist`)
  }
  const owners = state.world.store(Owner)
  const targetOwner = owners.get(payload.targetId)
  if (targetOwner === undefined) {
    throw new CommandRejectedError('ENTITY_UNAVAILABLE', command, `ATTACK: target ${payload.targetId} is not ownable`)
  }
  if (targetOwner.owner === command.playerId) {
    throw new CommandRejectedError(
      'NOT_OWNER',
      command,
      `ATTACK: target ${payload.targetId} belongs to the issuing player`
    )
  }
  if (!isEntityVisible(state, command.playerId, payload.targetId)) {
    throw new CommandRejectedError(
      'ENTITY_UNAVAILABLE',
      command,
      `ATTACK: target ${payload.targetId} is not visible to player ${command.playerId}`
    )
  }
  for (const unitId of payload.unitIds) {
    setOrders(state, unitId, [{ type: 'ATTACK', targetId: payload.targetId }])
    state.world.store(AttackTarget).set(unitId, {
      targetId: payload.targetId,
      lastKnownX: null,
      lastKnownY: null,
      lostVision: false
    })
    clearMovement(state, unitId)
  }
}
