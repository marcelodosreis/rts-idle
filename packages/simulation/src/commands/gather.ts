import type { ScheduledCommand } from '../contracts/commands.js'
import { CommandRejectedError } from '../contracts/commands.js'
import { Cargo, Kind, MineralNode, Movement, Orders, Position } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { UNIT_SPEED_TILES_PER_SECOND } from './move.js'
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
  if (node === undefined || node.remaining <= 0 || nodePosition === undefined) {
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
  const movements = state.world.store(Movement)
  const sortedWorkerIds = [...unitIds].sort((a, b) => a - b)
  for (const unitId of sortedWorkerIds) {
    orders.set(unitId, {
      queue: [{ type: 'GATHER', nodeId, baseId: null, phase: 'TO_NODE', progressTicks: 0 }]
    })
    const workerPosition = positions.get(unitId)!
    if (workerPosition.x === nodePosition.x && workerPosition.y === nodePosition.y) {
      movements.delete(unitId)
    } else {
      movements.set(unitId, {
        speedTilesPerSecond: UNIT_SPEED_TILES_PER_SECOND,
        destX: nodePosition.x,
        destY: nodePosition.y,
        remainderX: 0,
        remainderY: 0
      })
    }
  }
}
