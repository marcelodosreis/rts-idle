import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { constructionRefund } from '@rts/shared'
import type { ScheduledCommand } from '../contracts/commands.js'
import { Building } from '../ecs/building-component.js'
import { Orders, Owner } from '../ecs/components.js'
import { clearMovement } from '../movement/destination.js'
import { clearOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'
import { reject } from './reject.js'

/**
 * Detaches the active builder from a construction: if the worker's front order
 * is the `BUILD` order for this building, its orders and movement are cleared.
 * The building is left paused with no builder.
 */
export function detachBuilder(state: GameState, buildingId: number): void {
  const buildings = state.world.store(Building)
  const construction = buildings.get(buildingId)
  if (construction === undefined || construction.builderId === null) {
    return
  }
  const builderId = construction.builderId
  const frontOrder = state.world.store(Orders).get(builderId)?.queue[0]
  if (frontOrder?.type === 'BUILD' && frontOrder.buildingId === buildingId) {
    clearOrders(state, builderId)
    clearMovement(state, builderId)
  }
  buildings.set(buildingId, { ...construction, builderId: null })
}

/**
 * Cancels a not-yet-completed construction: refunds part of the cost, releases
 * the builder, and removes the building so its footprint is freed (P2.05).
 * Validates the complete transaction before mutating (atomicity, master plan §10.3).
 */
export function applyCancelConstruction(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'CANCEL_CONSTRUCTION') {
    throw new Error('applyCancelConstruction: expected a CANCEL_CONSTRUCTION command')
  }
  const { buildingId } = command.intent.payload
  if (state.phase !== 'RUNNING') {
    reject(command, 'INVALID_PHASE', 'CANCEL_CONSTRUCTION: game is not running')
  }
  const player = state.players.find((candidate) => candidate.id === command.playerId)
  if (player === undefined || player.defeated) {
    reject(command, 'INVALID_PHASE', `CANCEL_CONSTRUCTION: player ${command.playerId} is not active`)
  }
  if (!Number.isInteger(buildingId)) {
    reject(command, 'INVALID_PAYLOAD', 'CANCEL_CONSTRUCTION: building id is invalid')
  }
  const construction = state.world.store(Building).get(buildingId)
  if (construction === undefined) {
    reject(command, 'ENTITY_UNAVAILABLE', `CANCEL_CONSTRUCTION: construction ${buildingId} does not exist`)
  }
  const owner = state.world.store(Owner).get(buildingId)
  if (owner === undefined || owner.owner !== command.playerId) {
    reject(
      command,
      'NOT_OWNER',
      `CANCEL_CONSTRUCTION: player ${command.playerId} does not own construction ${buildingId}`
    )
  }
  if (construction.status === 'COMPLETED') {
    reject(command, 'INVALID_STATE', `CANCEL_CONSTRUCTION: construction ${buildingId} is already completed`)
  }

  const definition = BUILDING_DEFINITIONS[construction.buildingType]
  const refund = constructionRefund(definition.costMinerals, construction.progressTicks, construction.totalTicks)
  player.gold += refund
  detachBuilder(state, buildingId)
  state.world.removeEntity(buildingId)
}
