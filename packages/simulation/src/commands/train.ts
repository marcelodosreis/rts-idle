import { UNIT_PRODUCTION_DEFINITIONS } from '@rts/game-data'
import { applyResourceCost, canAfford, type TrainableUnitKind } from '@rts/shared'
import type { ScheduledCommand } from '../contracts/commands.js'
import { MAX_PRODUCTION_QUEUE } from '../data/production-rules.js'
import { hasCurrentCastleTier } from '../domain/tier-access.js'
import { Building } from '../ecs/building-component.js'
import { Owner, Production } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { reject } from './reject.js'

function getDefinition(unitKind: TrainableUnitKind) {
  return UNIT_PRODUCTION_DEFINITIONS[unitKind]
}

function validateTrain(
  state: GameState,
  command: ScheduledCommand
): { readonly player: GameState['players'][number]; readonly definition: ReturnType<typeof getDefinition> } {
  if (command.intent.type !== 'TRAIN') {
    throw new Error('validateTrain: expected TRAIN command')
  }
  const { producerId, unitKind } = command.intent.payload
  const player = state.players.find((candidate) => candidate.id === command.playerId)
  if (player === undefined || player.defeated) {
    reject(command, 'INVALID_PHASE', `TRAIN: player ${command.playerId} is not active`)
  }
  if (!state.world.hasEntity(producerId)) {
    reject(command, 'ENTITY_UNAVAILABLE', `TRAIN: producer ${producerId} does not exist`)
  }
  const building = state.world.store(Building).get(producerId)
  if (building === undefined || building.status !== 'COMPLETED') {
    reject(command, 'INVALID_STATE', `TRAIN: producer ${producerId} is not a completed production building`)
  }
  if (building.tierUpgrade !== undefined && building.tierUpgrade !== null) {
    reject(command, 'INVALID_STATE', `TRAIN: producer ${producerId} is upgrading`)
  }
  if (state.world.store(Owner).get(producerId)?.owner !== command.playerId) {
    reject(command, 'NOT_OWNER', `TRAIN: player ${command.playerId} does not own producer ${producerId}`)
  }
  const definition = getDefinition(unitKind)
  if (definition === undefined || definition.producer !== building.buildingType) {
    reject(command, 'INVALID_PAYLOAD', `TRAIN: unit ${unitKind} is not trainable`)
  }
  if (
    definition.minimumCastleTier !== undefined &&
    !hasCurrentCastleTier(state, command.playerId, definition.minimumCastleTier)
  ) {
    reject(command, 'TECH_REQUIREMENT', `TRAIN: ${unitKind} requires Castle ${definition.minimumCastleTier}`)
  }
  const queue = state.world.store(Production).get(producerId)?.queue ?? []
  if (queue.length >= MAX_PRODUCTION_QUEUE) {
    reject(command, 'INVALID_STATE', `TRAIN: producer ${producerId} queue is full`)
  }
  if (!canAfford(player.resources, definition.cost)) {
    reject(command, 'INSUFFICIENT_RESOURCES', `TRAIN: insufficient resources for ${unitKind}`)
  }
  if (player.usedSupply + player.reservedSupply + definition.supply > player.supplyCap) {
    reject(command, 'INSUFFICIENT_RESOURCES', `TRAIN: insufficient supply for ${unitKind}`)
  }
  return { player, definition }
}

export function applyTrain(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'TRAIN') {
    throw new Error('applyTrain: expected TRAIN command')
  }
  const { player, definition } = validateTrain(state, command)
  const producerId = command.intent.payload.producerId
  const production = state.world.store(Production)
  const queue = production.get(producerId)?.queue ?? []
  applyResourceCost(player.resources, definition.cost, -1)
  player.reservedSupply += definition.supply
  production.set(producerId, {
    queue: [
      ...queue,
      {
        unitKind: definition.unitKind,
        cost: definition.cost,
        reservedSupply: definition.supply,
        progressTicks: 0,
        totalTicks: definition.trainingTicks,
        status: queue.length === 0 ? 'ACTIVE' : 'QUEUED'
      }
    ]
  })
}
