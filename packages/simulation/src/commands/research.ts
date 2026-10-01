import { RESEARCH_DEFINITIONS } from '@rts/game-data'
import { applyResourceCost, canAfford, MAX_PRODUCTION_QUEUE, productionRefund } from '@rts/shared'
import type { ScheduledCommand } from '../contracts/commands.js'
import { hasCurrentCastleTier } from '../domain/tier-access.js'
import { Building } from '../ecs/building-component.js'
import { isResearchProductionItem, Owner, Production, type ProductionItem } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { reject } from './reject.js'

function findPlayer(state: GameState, command: ScheduledCommand): GameState['players'][number] {
  const player = state.players.find((candidate) => candidate.id === command.playerId)
  if (player === undefined || player.defeated) {
    reject(command, 'INVALID_PHASE', `RESEARCH: player ${command.playerId} is not active`)
  }
  return player
}

function validateMonastery(state: GameState, command: ScheduledCommand): GameState['players'][number] {
  if (command.intent.type !== 'RESEARCH') {
    throw new Error('validateResearch: expected RESEARCH')
  }
  const player = findPlayer(state, command)
  const { monasteryId, researchType } = command.intent.payload
  const building = state.world.store(Building).get(monasteryId)
  if (building === undefined || building.status !== 'COMPLETED' || building.buildingType !== 'MONASTERY') {
    reject(command, 'INVALID_STATE', `RESEARCH: ${monasteryId} is not a completed Monastery`)
  }
  if (state.world.store(Owner).get(monasteryId)?.owner !== command.playerId) {
    reject(command, 'NOT_OWNER', `RESEARCH: player ${command.playerId} does not own ${monasteryId}`)
  }
  if (!hasCurrentCastleTier(state, command.playerId, 2)) {
    reject(command, 'TECH_REQUIREMENT', 'RESEARCH: Castle II is required')
  }
  const definition = RESEARCH_DEFINITIONS[researchType]
  const queue = state.world.store(Production).get(monasteryId)?.queue ?? []
  if (queue.length >= MAX_PRODUCTION_QUEUE) {
    reject(command, 'INVALID_STATE', 'RESEARCH: Monastery queue is full')
  }
  if (player.completedResearch.includes(researchType) || hasQueuedResearch(state, command.playerId, researchType)) {
    reject(command, 'INVALID_STATE', `RESEARCH: ${researchType} is already completed or queued`)
  }
  if (!canAfford(player.resources, definition.cost)) {
    reject(command, 'INSUFFICIENT_RESOURCES', `RESEARCH: insufficient resources for ${researchType}`)
  }
  return player
}

function hasQueuedResearch(
  state: GameState,
  ownerId: number,
  researchType: keyof typeof RESEARCH_DEFINITIONS
): boolean {
  const owners = state.world.store(Owner)
  const buildings = state.world.store(Building)
  const productions = state.world.store(Production)
  return state.world.aliveIds().some((id) => {
    if (owners.get(id)?.owner !== ownerId || buildings.get(id)?.buildingType !== 'MONASTERY') {
      return false
    }
    return (
      productions.get(id)?.queue.some((item) => isResearchProductionItem(item) && item.researchType === researchType) ??
      false
    )
  })
}

export function applyResearch(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'RESEARCH') {
    throw new Error('applyResearch: expected RESEARCH')
  }
  const player = validateMonastery(state, command)
  const { monasteryId, researchType } = command.intent.payload
  const definition = RESEARCH_DEFINITIONS[researchType]
  const queue = state.world.store(Production).get(monasteryId)?.queue ?? []
  applyResourceCost(player.resources, definition.cost, -1)
  state.world.store(Production).set(monasteryId, {
    queue: [
      ...queue,
      {
        researchType,
        cost: definition.cost,
        progressTicks: 0,
        totalTicks: definition.researchTicks,
        status: queue.length === 0 ? 'ACTIVE' : 'QUEUED'
      }
    ]
  })
}

function validateCancelResearch(
  state: GameState,
  command: ScheduledCommand
): { readonly player: GameState['players'][number]; readonly queue: readonly ProductionItem[] } {
  if (command.intent.type !== 'CANCEL_RESEARCH') {
    throw new Error('validateCancelResearch: expected CANCEL_RESEARCH')
  }
  const player = findPlayer(state, command)
  const { monasteryId, queueIndex } = command.intent.payload
  const building = state.world.store(Building).get(monasteryId)
  if (building?.buildingType !== 'MONASTERY' || building.status !== 'COMPLETED') {
    reject(command, 'INVALID_STATE', 'CANCEL_RESEARCH: target is not a completed Monastery')
  }
  if (state.world.store(Owner).get(monasteryId)?.owner !== command.playerId) {
    reject(command, 'NOT_OWNER', 'CANCEL_RESEARCH: player does not own Monastery')
  }
  const queue = state.world.store(Production).get(monasteryId)?.queue
  if (queue === undefined || queueIndex < 0 || queueIndex >= queue.length) {
    reject(command, 'INVALID_STATE', 'CANCEL_RESEARCH: queue item is unavailable')
  }
  if (queue !== undefined && !isResearchProductionItem(queue[queueIndex]!)) {
    reject(command, 'INVALID_STATE', 'CANCEL_RESEARCH: queue item is not Research')
  }
  return { player, queue }
}

export function applyCancelResearch(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'CANCEL_RESEARCH') {
    throw new Error('applyCancelResearch: expected CANCEL_RESEARCH')
  }
  const { monasteryId, queueIndex } = command.intent.payload
  const { player, queue } = validateCancelResearch(state, command)
  const item = queue[queueIndex]
  if (item === undefined) {
    throw new Error('applyCancelResearch: validated item is missing')
  }
  if (!isResearchProductionItem(item)) {
    throw new Error('applyCancelResearch: validated item is not research')
  }
  const refund = productionRefund(item.status, item.cost, item.progressTicks, item.totalTicks)
  const remaining = queue.filter((_, index) => index !== queueIndex)
  state.world.store(Production).set(monasteryId, {
    queue: remaining.map((entry, index) => (index === 0 ? { ...entry, status: 'ACTIVE' as const } : entry))
  })
  applyResourceCost(player.resources, refund, 1)
}
