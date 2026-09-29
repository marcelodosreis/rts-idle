import { isProductionBuilding } from '@rts/game-data'
import { productionRefund } from '@rts/shared'
import type { ScheduledCommand } from '../contracts/commands.js'
import { Building } from '../ecs/building-component.js'
import { isResearchProductionItem, Owner, Production } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { reject } from './reject.js'

function validateProducer(
  state: GameState,
  command: ScheduledCommand
): {
  readonly producerId: number
  readonly player: GameState['players'][number]
  readonly queue: NonNullable<ReturnType<typeof getQueue>>
} {
  if (command.intent.type !== 'CANCEL_PRODUCTION') {
    throw new Error('validateCancelProduction: expected CANCEL_PRODUCTION')
  }
  const { producerId, queueIndex } = command.intent.payload
  const player = state.players.find((candidate) => candidate.id === command.playerId)
  if (player === undefined || player.defeated) {
    reject(command, 'INVALID_PHASE', `CANCEL_PRODUCTION: player ${command.playerId} is not active`)
  }
  const building = state.world.store(Building).get(producerId)
  if (building === undefined) {
    reject(command, 'ENTITY_UNAVAILABLE', `CANCEL_PRODUCTION: producer ${producerId} does not exist`)
  }
  if (building.status !== 'COMPLETED' || !isProductionBuilding(building.buildingType)) {
    reject(command, 'INVALID_STATE', `CANCEL_PRODUCTION: producer ${producerId} is not completed`)
  }
  if (state.world.store(Owner).get(producerId)?.owner !== command.playerId) {
    reject(command, 'NOT_OWNER', `CANCEL_PRODUCTION: player ${command.playerId} does not own producer ${producerId}`)
  }
  const queue = getQueue(state, producerId)
  if (queue === undefined || queueIndex < 0 || queueIndex >= queue.length) {
    reject(command, 'INVALID_STATE', `CANCEL_PRODUCTION: queue index ${queueIndex} is unavailable`)
  }
  if (queue[queueIndex]?.status !== 'QUEUED') {
    reject(command, 'INVALID_STATE', 'CANCEL_PRODUCTION: only queued items can be canceled')
  }
  if (isResearchProductionItem(queue[queueIndex]!)) {
    reject(command, 'INVALID_STATE', 'CANCEL_PRODUCTION: queue item is Research')
  }
  return { producerId, player, queue }
}

function getQueue(state: GameState, producerId: number) {
  return state.world.store(Production).get(producerId)?.queue
}

export function applyCancelProduction(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'CANCEL_PRODUCTION') {
    throw new Error('applyCancelProduction: expected CANCEL_PRODUCTION')
  }
  const { queueIndex } = command.intent.payload
  const { producerId, player, queue } = validateProducer(state, command)
  const item = queue[queueIndex]
  if (item === undefined) {
    throw new Error('applyCancelProduction: validated item is missing')
  }
  const refund = productionRefund(item.status, item.costMinerals, item.progressTicks, item.totalTicks)
  const remaining = queue.filter((_, index) => index !== queueIndex)
  const nextQueue = remaining.map((entry, index) => (index === 0 ? { ...entry, status: 'ACTIVE' as const } : entry))
  player.gold += refund
  if (isResearchProductionItem(item)) {
    throw new Error('applyCancelProduction: validated item is Research')
  }
  player.reservedSupply -= item.reservedSupply
  state.world.store(Production).set(producerId, { queue: nextQueue })
}
