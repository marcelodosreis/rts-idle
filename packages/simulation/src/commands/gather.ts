import type { ScheduledCommand } from '../contracts/commands.js'
import { CommandRejectedError } from '../contracts/commands.js'
import { MINERAL_CARGO_CAPACITY } from '../data/economy-rules.js'
import { Cargo, Kind, MineralNode, Orders, Position } from '../ecs/components.js'
import { setMovementDestination } from '../movement/destination.js'
import type { GameState } from '../state/state.js'
import { validateOwnedUnits } from './validate-units.js'

/** Validates and applies a GATHER command without partially mutating a selection. */
export function applyGather(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'GATHER') {
    throw new Error('applyGather: expected a GATHER command')
  }
  const { unitIds, nodeId } = command.intent.payload
  validateOwnedUnits(state, command, unitIds)
  const positions = state.world.store(Position)
  const kinds = state.world.store(Kind)
  const cargo = state.world.store(Cargo)
  const node = state.world.store(MineralNode).get(nodeId)
  const nodePosition = positions.get(nodeId)
  if (
    node === undefined ||
    node.remaining < MINERAL_CARGO_CAPACITY ||
    node.remaining % MINERAL_CARGO_CAPACITY !== 0 ||
    nodePosition === undefined
  ) {
    throw new CommandRejectedError('ENTITY_UNAVAILABLE', command, `GATHER: target ${nodeId} is not an available node`)
  }
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
      queue: [{ type: 'GATHER', nodeId, baseId: null, phase: 'TO_NODE', progressTicks: 0 }]
    })
    setMovementDestination(state, unitId, nodePosition.x, nodePosition.y)
  }
}
