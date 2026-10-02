import { BUILDING_DEFINITIONS, type BuildingDefinition, unitDefinitionFor } from '@rts/game-data'
import { applyResourceCost, BUILDING_GEOMETRY, BUILDING_TYPES, canAfford, tilesToFixed } from '@rts/shared'
import type { ScheduledCommand } from '../contracts/commands.js'
import { hasCurrentCastleTier } from '../domain/tier-access.js'
import { Building, type BuildingData } from '../ecs/building-component.js'
import { Kind, Orders, Owner, Position } from '../ecs/components.js'
import { clearMovement, setMovementDestination } from '../movement/destination.js'
import { clearOrders, setOrders } from '../orders/order-queue.js'
import type { BuildingFootprint } from '../placement/building-placement.js'
import { validateBuildingPlacement } from '../placement/building-placement.js'
import { constructionWorkPoint } from '../placement/construction-work-point.js'
import type { GameState, PlayerState } from '../state/state.js'
import { reject } from './reject.js'

function sameFootprint(first: BuildingFootprint, second: BuildingFootprint): boolean {
  return first.x === second.x && first.y === second.y && first.width === second.width && first.height === second.height
}

interface BuildContext {
  readonly player: PlayerState
  readonly definition: BuildingDefinition
  readonly unitId: number
  readonly footprint: BuildingFootprint
  readonly existingId: number | undefined
}

function validateBuildingRequirement(
  state: GameState,
  command: ScheduledCommand,
  definition: BuildingDefinition
): void {
  if (
    definition.minimumCastleTier !== undefined &&
    !hasCurrentCastleTier(state, command.playerId, definition.minimumCastleTier)
  ) {
    reject(command, 'TECH_REQUIREMENT', `BUILD: ${definition.label} requires Castle ${definition.minimumCastleTier}`)
  }
}

/** Validates the complete BUILD transaction before creating or reserving anything. */
function validateBuild(state: GameState, command: ScheduledCommand): BuildContext {
  if (command.intent.type !== 'BUILD') {
    throw new Error('validateBuild: expected a BUILD command')
  }
  const { unitId, buildingType, x, y } = command.intent.payload
  if (state.phase !== 'RUNNING') {
    reject(command, 'INVALID_PHASE', 'BUILD: game is not running')
  }
  const player = state.players.find((candidate) => candidate.id === command.playerId)
  if (player === undefined || player.defeated) {
    reject(command, 'INVALID_PHASE', `BUILD: player ${command.playerId} is not active`)
  }
  if (!BUILDING_TYPES.includes(buildingType) || !Number.isInteger(x) || !Number.isInteger(y)) {
    reject(command, 'INVALID_PAYLOAD', 'BUILD: building type and tile coordinates are invalid')
  }
  const definition = BUILDING_DEFINITIONS[buildingType]
  validateBuildingRequirement(state, command, definition)
  if (!state.world.hasEntity(unitId)) {
    reject(command, 'ENTITY_UNAVAILABLE', `BUILD: worker ${unitId} does not exist`)
  }
  const owner = state.world.store(Owner).get(unitId)
  if (owner === undefined || owner.owner !== command.playerId) {
    reject(command, 'NOT_OWNER', `BUILD: player ${command.playerId} does not own worker ${unitId}`)
  }
  const kind = state.world.store(Kind).get(unitId)
  if (
    kind === undefined ||
    !unitDefinitionFor(kind).canBuild ||
    state.world.store(Position).get(unitId) === undefined
  ) {
    reject(command, 'ENTITY_UNAVAILABLE', `BUILD: entity ${unitId} is not a worker`)
  }

  const footprint: BuildingFootprint = {
    x,
    y,
    width: definition.footprint.width,
    height: definition.footprint.height
  }
  const buildings = state.world.store(Building)
  const existingId = state.world.query(Building).find((id) => {
    const construction = buildings.get(id)
    return construction !== undefined && sameFootprint(construction.footprint, footprint)
  })
  const existing = existingId === undefined ? undefined : buildings.get(existingId)

  if (existing === undefined || existing.status === 'COMPLETED') {
    const occupied = state.world
      .query(Building)
      .map((id) => buildings.get(id))
      .filter((construction): construction is BuildingData => construction !== undefined)
    const placement = validateBuildingPlacement(
      state.mapBounds,
      occupied.map((construction) => construction.footprint),
      footprint
    )
    if (!placement.ok) {
      reject(command, 'INVALID_PLACEMENT', `BUILD: placement is ${placement.reason}`)
    }
    if (!canAfford(player.resources, definition.cost)) {
      reject(command, 'INSUFFICIENT_RESOURCES', 'BUILD: insufficient resources')
    }
  }

  return { player, definition, unitId, footprint, existingId }
}

/** Applies a validated BUILD: takeover of a foundation, or a new reservation. */
export function applyBuild(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'BUILD') {
    throw new Error('applyBuild: expected a BUILD command')
  }
  const context = validateBuild(state, command)
  const { unitId, definition, footprint, existingId } = context
  const buildings = state.world.store(Building)
  const existing = existingId === undefined ? undefined : buildings.get(existingId)
  if (existingId !== undefined && existing !== undefined && existing.status !== 'COMPLETED') {
    assignBuilder(state, existingId, unitId, footprint)
    return
  }

  const buildingId = state.nextEntityId
  if (state.world.hasEntity(buildingId)) {
    reject(command, 'ENTITY_UNAVAILABLE', `BUILD: entity id ${buildingId} is unavailable`)
  }
  applyResourceCost(context.player.resources, definition.cost, -1)
  state.nextEntityId += 1
  state.world.createEntity(buildingId)
  state.world.store(Position).set(buildingId, { x: tilesToFixed(footprint.x), y: tilesToFixed(footprint.y) })
  state.world.store(Owner).set(buildingId, { owner: command.playerId })
  buildings.set(buildingId, {
    buildingType: command.intent.payload.buildingType,
    status: 'FOUNDATION',
    progressTicks: 0,
    totalTicks: definition.constructionTicks,
    builderId: unitId,
    footprint
  })
  assignBuilder(state, buildingId, unitId, footprint)
}

function assignBuilder(state: GameState, buildingId: number, workerId: number, footprint: BuildingFootprint): void {
  const buildings = state.world.store(Building)
  const current = buildings.get(buildingId)
  if (current === undefined) {
    throw new Error(`BUILD: construction ${buildingId} disappeared during assignment`)
  }
  if (current.builderId !== null && current.builderId !== workerId) {
    const previousOrder = state.world.store(Orders).get(current.builderId)?.queue[0]
    if (previousOrder?.type === 'BUILD' && previousOrder.buildingId === buildingId) {
      clearOrders(state, current.builderId)
      clearMovement(state, current.builderId)
    }
  }
  for (const id of state.world.query(Building)) {
    const construction = buildings.get(id)
    if (construction?.builderId === workerId && id !== buildingId) {
      buildings.set(id, { ...construction, builderId: null })
    }
  }
  const positions = state.world.store(Position)
  const workerPosition = positions.get(workerId)
  if (workerPosition === undefined) {
    throw new Error(`BUILD: worker ${workerId} has no position`)
  }
  const workPoint = constructionWorkPoint(
    workerPosition,
    footprint,
    state.mapBounds,
    BUILDING_GEOMETRY[current.buildingType].visualSize
  )
  buildings.set(buildingId, { ...current, builderId: workerId, footprint })
  setOrders(state, workerId, [{ type: 'BUILD', buildingId, buildingType: current.buildingType, workPoint }])
  if (workerPosition.x === workPoint.x && workerPosition.y === workPoint.y) {
    clearMovement(state, workerId)
  } else {
    setMovementDestination(state, workerId, workPoint.x, workPoint.y)
  }
}
