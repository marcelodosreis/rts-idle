import { BASE_BUILDING } from '@rts/game-data'
import { tilesToFixed } from '@rts/shared'
import type { ScheduledCommand } from '../contracts/commands.js'
import { CommandRejectedError } from '../contracts/commands.js'
import { Kind, Movement, Orders, Owner, Position } from '../ecs/components.js'
import { Construction } from '../ecs/construction-component.js'
import type { BuildingFootprint } from '../placement/building-placement.js'
import { validateBuildingPlacement } from '../placement/building-placement.js'
import type { GameState } from '../state/state.js'
import { UNIT_SPEED_TILES_PER_SECOND } from './move.js'

function sameFootprint(first: BuildingFootprint, second: BuildingFootprint): boolean {
  return first.x === second.x && first.y === second.y && first.width === second.width && first.height === second.height
}

function reject(
  command: ScheduledCommand,
  code:
    | 'INVALID_PAYLOAD'
    | 'INVALID_PHASE'
    | 'INVALID_PLACEMENT'
    | 'INSUFFICIENT_RESOURCES'
    | 'NOT_OWNER'
    | 'ENTITY_UNAVAILABLE',
  message: string
): never {
  throw new CommandRejectedError(code, command, message)
}

/** Validates the complete BUILD transaction before creating or reserving anything. */
export function applyBuild(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'BUILD') {
    throw new Error('applyBuild: expected a BUILD command')
  }
  const { unitId, buildingType, x, y } = command.intent.payload
  if (state.phase !== 'RUNNING') {
    reject(command, 'INVALID_PHASE', 'BUILD: game is not running')
  }
  const player = state.players.find((candidate) => candidate.id === command.playerId)
  if (player === undefined || player.defeated) {
    reject(command, 'INVALID_PHASE', `BUILD: player ${command.playerId} is not active`)
  }
  if (buildingType !== 'BASE' || !Number.isInteger(x) || !Number.isInteger(y)) {
    reject(command, 'INVALID_PAYLOAD', 'BUILD: building type and tile coordinates are invalid')
  }
  if (!state.world.hasEntity(unitId)) {
    reject(command, 'ENTITY_UNAVAILABLE', `BUILD: worker ${unitId} does not exist`)
  }
  const owner = state.world.store(Owner).get(unitId)
  if (owner === undefined || owner.owner !== command.playerId) {
    reject(command, 'NOT_OWNER', `BUILD: player ${command.playerId} does not own worker ${unitId}`)
  }
  if (state.world.store(Kind).get(unitId) !== 'pawn' || state.world.store(Position).get(unitId) === undefined) {
    reject(command, 'ENTITY_UNAVAILABLE', `BUILD: entity ${unitId} is not a worker`)
  }

  const footprint: BuildingFootprint = {
    x,
    y,
    width: BASE_BUILDING.footprint.width,
    height: BASE_BUILDING.footprint.height
  }
  const constructions = state.world.store(Construction)
  const occupied = state.world
    .aliveIds()
    .map((id) => constructions.get(id))
    .filter((construction): construction is NonNullable<typeof construction> => construction !== undefined)
  const existingId = state.world.aliveIds().find((id) => {
    const construction = constructions.get(id)
    return construction !== undefined && sameFootprint(construction.footprint, footprint)
  })
  const existing = existingId === undefined ? undefined : constructions.get(existingId)
  if (existing !== undefined && existing.status !== 'COMPLETED') {
    assignBuilder(state, existingId!, unitId, footprint)
    return
  }
  const placement = validateBuildingPlacement(
    state.mapBounds,
    occupied.map((construction) => construction.footprint),
    footprint
  )
  if (!placement.ok) {
    reject(command, 'INVALID_PLACEMENT', `BUILD: placement is ${placement.reason}`)
  }
  if (player!.gold < BASE_BUILDING.costMinerals) {
    reject(command, 'INSUFFICIENT_RESOURCES', 'BUILD: insufficient minerals')
  }

  const buildingId = state.nextEntityId
  if (state.world.hasEntity(buildingId)) {
    reject(command, 'ENTITY_UNAVAILABLE', `BUILD: entity id ${buildingId} is unavailable`)
  }
  player!.gold -= BASE_BUILDING.costMinerals
  state.nextEntityId += 1
  state.world.createEntity(buildingId)
  state.world.store(Position).set(buildingId, { x: tilesToFixed(x), y: tilesToFixed(y) })
  state.world.store(Owner).set(buildingId, { owner: command.playerId })
  constructions.set(buildingId, {
    buildingType: 'BASE',
    status: 'FOUNDATION',
    progressTicks: 0,
    totalTicks: BASE_BUILDING.constructionTicks,
    builderId: unitId,
    footprint
  })
  assignBuilder(state, buildingId, unitId, footprint)
}

function assignBuilder(state: GameState, buildingId: number, workerId: number, footprint: BuildingFootprint): void {
  const constructions = state.world.store(Construction)
  const current = constructions.get(buildingId)
  if (current === undefined) {
    throw new Error(`BUILD: construction ${buildingId} disappeared during assignment`)
  }
  if (current.builderId !== null && current.builderId !== workerId) {
    const previousOrder = state.world.store(Orders).get(current.builderId)?.queue[0]
    if (previousOrder?.type === 'BUILD' && previousOrder.buildingId === buildingId) {
      state.world.store(Orders).delete(current.builderId)
      state.world.store(Movement).delete(current.builderId)
    }
  }
  for (const id of state.world.aliveIds()) {
    const construction = constructions.get(id)
    if (construction?.builderId === workerId && id !== buildingId) {
      constructions.set(id, { ...construction, builderId: null })
    }
  }
  constructions.set(buildingId, { ...current, builderId: workerId, footprint })
  const positions = state.world.store(Position)
  const target = positions.get(buildingId)
  if (target === undefined) {
    throw new Error(`BUILD: construction ${buildingId} has no position`)
  }
  state.world.store(Orders).set(workerId, { queue: [{ type: 'BUILD', buildingId, buildingType: 'BASE' }] })
  const workerPosition = positions.get(workerId)
  if (workerPosition?.x === target.x && workerPosition.y === target.y) {
    state.world.store(Movement).delete(workerId)
  } else {
    state.world.store(Movement).set(workerId, {
      speedTilesPerSecond: UNIT_SPEED_TILES_PER_SECOND,
      destX: target.x,
      destY: target.y,
      remainderX: 0,
      remainderY: 0
    })
  }
}
