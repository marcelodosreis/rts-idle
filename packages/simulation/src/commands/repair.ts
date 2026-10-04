import { BUILDING_DEFINITIONS, unitDefinitionFor } from '@rts/game-data'
import type { EntityId } from '@rts/shared'
import { CommandRejectedError, type ScheduledCommand } from '../contracts/commands.js'
import { Building } from '../ecs/building-component.js'
import { Health, Kind, Orders, Owner, Position } from '../ecs/components.js'
import { clearMovement, setMovementDestination } from '../movement/destination.js'
import { setOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'
import { validateControllableUnits } from './validate-units.js'

function reject(command: ScheduledCommand, message: string): never {
  throw new CommandRejectedError('ENTITY_UNAVAILABLE', command, message)
}

function chooseRepairer(state: GameState, command: ScheduledCommand, unitIds: readonly EntityId[]): EntityId {
  const kinds = state.world.store(Kind)
  const repairer = [...unitIds]
    .sort((a, b) => a - b)
    .find((id) => {
      const kind = kinds.get(id)
      return kind !== undefined && unitDefinitionFor(kind).canRepair
    })
  if (repairer === undefined) {
    reject(command, 'REPAIR: selection contains no worker')
  }
  return repairer
}

function assertTarget(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'REPAIR') {
    throw new Error('assertTarget: expected a REPAIR command')
  }
  const targetId = command.intent.payload.targetId
  const building = state.world.store(Building).get(targetId)
  const health = state.world.store(Health).get(targetId)
  const owner = state.world.store(Owner).get(targetId)
  const position = state.world.store(Position).get(targetId)
  if (health === undefined || owner?.owner !== command.playerId || position === undefined) {
    reject(command, `REPAIR: target ${targetId} is unavailable`)
  }
  if (health.current >= health.max) {
    reject(command, `REPAIR: target ${targetId} is already at full health`)
  }
  if (building !== undefined) {
    const definition = BUILDING_DEFINITIONS[building.buildingType]
    if (building.status !== 'COMPLETED' || !definition.mechanical || definition.repairProfile === null) {
      reject(command, `REPAIR: target ${targetId} is not a completed mechanical building`)
    }
    return
  }
  const kind = state.world.store(Kind).get(targetId)
  if (kind === undefined || !unitDefinitionFor(kind).repairable || unitDefinitionFor(kind).repairProfile === null) {
    reject(command, `REPAIR: target ${targetId} is not mechanical`)
  }
}

function assertNoActiveRepair(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'REPAIR') {
    throw new Error('assertNoActiveRepair: expected a REPAIR command')
  }
  const targetId = command.intent.payload.targetId
  for (const id of state.world.query(Orders)) {
    const front = state.world.store(Orders).get(id)?.queue[0]
    if (front?.type === 'REPAIR' && front.targetId === targetId) {
      reject(command, `REPAIR: target ${targetId} already has an active repairer`)
    }
  }
}

export function applyRepair(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'REPAIR') {
    throw new Error('applyRepair: expected a REPAIR command')
  }
  validateControllableUnits(state, command, command.intent.payload.unitIds)
  const repairerId = chooseRepairer(state, command, command.intent.payload.unitIds)
  const position = state.world.store(Position).get(repairerId)
  const targetPosition = state.world.store(Position).get(command.intent.payload.targetId)
  if (position === undefined || targetPosition === undefined) {
    reject(command, 'REPAIR: repairer or target has no position')
  }
  assertTarget(state, command)
  assertNoActiveRepair(state, command)
  setOrders(state, repairerId, [{ type: 'REPAIR', targetId: command.intent.payload.targetId, progressTicks: 0 }])
  if (position.x === targetPosition.x && position.y === targetPosition.y) {
    clearMovement(state, repairerId)
  } else {
    setMovementDestination(state, repairerId, targetPosition.x, targetPosition.y)
  }
}
