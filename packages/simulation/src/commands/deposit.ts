import { unitDefinitionFor } from '@rts/game-data'
import type { ScheduledCommand } from '../contracts/commands.js'
import { CommandRejectedError } from '../contracts/commands.js'
import { isCompletedBase } from '../domain/building-predicates.js'
import { Building } from '../ecs/building-component.js'
import { Cargo, Kind, Owner, Position } from '../ecs/components.js'
import { setMovementDestination } from '../movement/destination.js'
import { setOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'
import { validateControllableUnits } from './validate-units.js'

/**
 * Applies a DEPOSIT command: owned workers walk to an owned completed Base and
 * deliver their carried resource on arrival. Validates the whole transaction
 * before mutating (atomicity, master plan §10.3). The target Base must be a
 * completed Base owned by the issuing player; every selected entity must be an
 * available pawn with a Cargo component.
 */
export function applyDeposit(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'DEPOSIT') {
    throw new Error('applyDeposit: expected a DEPOSIT command')
  }
  const { unitIds, buildingId } = command.intent.payload
  validateControllableUnits(state, command, unitIds)
  const buildings = state.world.store(Building)
  const positions = state.world.store(Position)
  const basePosition = positions.get(buildingId)
  if (!isCompletedBase(buildings.get(buildingId)) || basePosition === undefined) {
    throw new CommandRejectedError(
      'ENTITY_UNAVAILABLE',
      command,
      `DEPOSIT: target ${buildingId} is not an available completed Base`
    )
  }
  if (state.world.store(Owner).get(buildingId)?.owner !== command.playerId) {
    throw new CommandRejectedError(
      'NOT_OWNER',
      command,
      `DEPOSIT: player ${command.playerId} does not own Base ${buildingId}`
    )
  }
  const kinds = state.world.store(Kind)
  const cargo = state.world.store(Cargo)
  for (const unitId of unitIds) {
    const kind = kinds.get(unitId)
    if (
      kind === undefined ||
      !unitDefinitionFor(kind).acceptsDeposit ||
      cargo.get(unitId) === undefined ||
      positions.get(unitId) === undefined
    ) {
      throw new CommandRejectedError(
        'ENTITY_UNAVAILABLE',
        command,
        `DEPOSIT: entity ${unitId} is not an available worker`
      )
    }
  }

  const sortedWorkerIds = [...unitIds].sort((a, b) => a - b)
  for (const unitId of sortedWorkerIds) {
    setOrders(state, unitId, [{ type: 'DEPOSIT', buildingId }])
    setMovementDestination(state, unitId, basePosition.x, basePosition.y)
  }
}
