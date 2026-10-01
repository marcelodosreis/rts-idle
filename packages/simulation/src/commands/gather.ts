import type { ScheduledCommand } from '../contracts/commands.js'
import { CommandRejectedError } from '../contracts/commands.js'
import { Cargo, Kind, Orders, Position } from '../ecs/components.js'
import { setMovementDestination } from '../movement/destination.js'
import type { GameState } from '../state/state.js'
import { validateOwnedUnits } from './validate-units.js'

/** Validates and applies a GATHER command without partially mutating a selection. */
export function applyGather(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'GATHER') {
    throw new Error('applyGather: expected a GATHER command')
  }
  const { unitIds, resourceId } = command.intent.payload
  validateOwnedUnits(state, command, unitIds)
  const resource = state.resources.catalog.entry(resourceId)
  if (
    resource === undefined ||
    !state.resources.isAvailable(resourceId) ||
    (state.resources.amount(resourceId) ?? 0) < resource.harvestAmount
  ) {
    throw new CommandRejectedError('ENTITY_UNAVAILABLE', command, `GATHER: resource ${resourceId} is unavailable`)
  }
  const positions = state.world.store(Position)
  const kinds = state.world.store(Kind)
  const cargo = state.world.store(Cargo)
  for (const unitId of unitIds) {
    if (kinds.get(unitId) !== 'pawn' || cargo.get(unitId) === undefined || positions.get(unitId) === undefined) {
      throw new CommandRejectedError(
        'ENTITY_UNAVAILABLE',
        command,
        `GATHER: entity ${unitId} is not an available worker`
      )
    }
  }

  const orders = state.world.store(Orders)
  const sortedWorkerIds = [...unitIds].sort((a, b) => a - b)
  for (const unitId of sortedWorkerIds) {
    orders.set(unitId, {
      queue: [{ type: 'GATHER', resourceId, baseId: null, phase: 'TO_RESOURCE', progressTicks: 0 }]
    })
    setMovementDestination(state, unitId, resource.x, resource.y)
  }
}
