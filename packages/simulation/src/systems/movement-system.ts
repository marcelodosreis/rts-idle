import type { EntityId, MovementBlockReason } from '@rts/shared'
import { FORMATION_SPACING } from '../domain/formation.js'
import { effectiveMovementSpeed } from '../domain/research-effects.js'
import { Kind, Movement, type MovementData, Orders, Owner, Position, type PositionData } from '../ecs/components.js'
import { AVOIDANCE_OFFSETS, type MovementSegment, segmentHitsBuilding, segmentIsClear } from '../movement/collision.js'
import {
  blockedMovement,
  MOVEMENT_BLOCK_NOTIFICATION_TICKS,
  MOVEMENT_PATH_RETRY_TICKS,
  movementTarget,
  planMovementRoute,
  retryRoute,
  routeArrived,
  segmentHitsStaticObstacle
} from '../movement/routing.js'
import { createWorldSpatialIndex, UNIT_COLLISION_RADIUS_FIXED } from '../spatial/world-spatial-index.js'
import type { GameState } from '../state/state.js'
import { type MovementStepResult, movementStep } from './movement-step.js'

interface MovementCandidate {
  readonly step: MovementStepResult
  readonly segment: MovementSegment
}

type SpatialIndexes = ReturnType<typeof createWorldSpatialIndex>
const BUILD_WORK_AREA_RADIUS_FIXED = UNIT_COLLISION_RADIUS_FIXED * 4

interface StepCandidateOptions {
  readonly state: GameState
  readonly id: EntityId
  readonly position: PositionData
  readonly movement: MovementData
  readonly target: { readonly x: number; readonly y: number }
  readonly offset: { readonly x: number; readonly y: number }
  readonly index: SpatialIndexes
  readonly positions: ReadonlyMap<EntityId, PositionData>
  readonly allowDestinationOverlap: boolean
  readonly ignoredUnitIds: ReadonlySet<EntityId>
}

interface FindCandidateOptions {
  readonly state: GameState
  readonly id: EntityId
  readonly position: PositionData
  readonly movement: MovementData
  readonly index: SpatialIndexes
  readonly positions: ReadonlyMap<EntityId, PositionData>
  readonly allowDestinationOverlap: boolean
  readonly ignoredUnitIds: ReadonlySet<EntityId>
}

interface AdvanceUnitOptions {
  readonly state: GameState
  readonly id: EntityId
  readonly position: PositionData
  readonly movement: MovementData
  readonly candidate: MovementCandidate | null
  readonly index: SpatialIndexes
  readonly positions: Map<EntityId, PositionData>
}

function positionMap(state: GameState): Map<EntityId, PositionData> {
  const positions = state.world.store(Position)
  return new Map(
    state.world.query(Position).flatMap((id) => {
      const position = positions.get(id)
      return position === undefined ? [] : [[id, position] as const]
    })
  )
}

function segmentFor(position: PositionData, target: { readonly x: number; readonly y: number }): MovementSegment {
  return { fromX: position.x, fromY: position.y, toX: target.x, toY: target.y }
}

function allowsDestinationOverlap(state: GameState, id: EntityId): boolean {
  const order = state.world.store(Orders).get(id)?.queue[0]
  return order?.type === 'GATHER' || order?.type === 'DEPOSIT'
}

function cooperativeMovement(state: GameState, id: EntityId): boolean {
  const order = state.world.store(Orders).get(id)?.queue[0]
  return order === undefined || order.type === 'GATHER' || order.type === 'DEPOSIT' || order.type === 'BUILD'
}

function cooperativeUnitIds(state: GameState, id: EntityId, movement: MovementData): ReadonlySet<EntityId> {
  const orders = state.world.store(Orders)
  const currentOrder = orders.get(id)?.queue[0]
  if (!cooperativeMovement(state, id)) {
    return new Set()
  }
  const movements = state.world.store(Movement)
  const positions = state.world.store(Position)
  const owners = state.world.store(Owner)
  const currentOwner = owners.get(id)?.owner
  const shared = new Set<EntityId>()
  for (const candidateId of state.world.query(Position, Owner, Kind)) {
    if (candidateId === id) {
      continue
    }
    const candidateMovement = movements.get(candidateId)
    const candidateOrder = orders.get(candidateId)?.queue[0]
    const candidatePosition = positions.get(candidateId)
    const closeFormationDestinations =
      movement.path === null &&
      candidateMovement?.path === null &&
      Math.abs((candidateMovement?.destX ?? 0) - movement.destX) <= FORMATION_SPACING * 2 &&
      Math.abs((candidateMovement?.destY ?? 0) - movement.destY) <= FORMATION_SPACING * 2
    const sharedDestination =
      candidateMovement?.destX === movement.destX &&
      candidateMovement.destY === movement.destY &&
      (candidateOrder?.type === 'GATHER' || candidateOrder?.type === 'DEPOSIT')
    const formationMovement = candidateOrder === undefined && closeFormationDestinations
    const formationDestination =
      currentOrder === undefined &&
      candidateOrder === undefined &&
      candidateMovement === undefined &&
      candidatePosition !== undefined &&
      ((Math.abs(candidatePosition.x - movement.destX) === FORMATION_SPACING &&
        candidatePosition.y === movement.destY) ||
        (candidatePosition.x === movement.destX &&
          Math.abs(candidatePosition.y - movement.destY) === FORMATION_SPACING) ||
        (Math.abs(candidatePosition.x - movement.destX) === FORMATION_SPACING &&
          Math.abs(candidatePosition.y - movement.destY) === FORMATION_SPACING))
    const buildWorkArea =
      currentOrder?.type === 'BUILD' &&
      candidateOrder === undefined &&
      candidateMovement === undefined &&
      candidatePosition !== undefined &&
      (candidatePosition.x - movement.destX) ** 2 + (candidatePosition.y - movement.destY) ** 2 <=
        BUILD_WORK_AREA_RADIUS_FIXED ** 2 &&
      currentOwner !== undefined &&
      owners.get(candidateId)?.owner === currentOwner
    if (sharedDestination || formationMovement || formationDestination || buildWorkArea) {
      shared.add(candidateId)
    }
  }
  return shared
}

function routeNeeded(state: GameState, position: PositionData, movement: MovementData, index: SpatialIndexes): boolean {
  if (movement.path !== null) {
    return false
  }
  const target = movementTarget(state, movement)
  const segment = segmentFor(position, target)
  return segmentHitsBuilding(index.buildings, segment) || segmentHitsStaticObstacle(state, segment)
}

function prepareMovement(
  state: GameState,
  position: PositionData,
  movement: MovementData,
  index: SpatialIndexes
): MovementData {
  if (
    movement.path !== null &&
    movement.path.length === 0 &&
    movement.blockedTicks >= MOVEMENT_PATH_RETRY_TICKS &&
    movement.blockedTicks % MOVEMENT_PATH_RETRY_TICKS === 0
  ) {
    return retryRoute(movement)
  }
  const target = movementTarget(state, movement)
  const segment = segmentFor(position, target)
  if (
    (movement.path !== null &&
      movement.path.length > 0 &&
      (segmentHitsBuilding(index.buildings, segment) || segmentHitsStaticObstacle(state, segment))) ||
    routeNeeded(state, position, movement, index)
  ) {
    return planMovementRoute(state, position, movement)
  }
  return movement
}

function stepCandidate(options: StepCandidateOptions): MovementCandidate | null {
  const { state, id, position, movement, target, offset, index, positions, allowDestinationOverlap, ignoredUnitIds } =
    options
  const stepInput = {
    x: position.x,
    y: position.y,
    destX: target.x,
    destY: target.y,
    speedTilesPerSecondFixed: effectiveMovementSpeed(state, id, movement.speedTilesPerSecondFixed),
    remainderX: movement.remainderX,
    remainderY: movement.remainderY
  }
  const directStep = movementStep(stepInput)
  const step =
    offset.x === 0 && offset.y === 0
      ? directStep
      : movementStep({
          ...stepInput,
          destX: directStep.x + offset.x,
          destY: directStep.y + offset.y
        })
  if (!step.arrived && step.x === position.x && step.y === position.y) {
    return null
  }
  const segment = { fromX: position.x, fromY: position.y, toX: step.x, toY: step.y }
  const allowedDestination = allowDestinationOverlap && offset.x === 0 && offset.y === 0 ? target : undefined
  if (
    !segmentIsClear(index, positions, {
      movingId: id,
      segment,
      allowedDestination,
      ignoredUnitIds
    })
  ) {
    return null
  }
  return {
    step: offset.x === 0 && offset.y === 0 ? step : { ...step, arrived: false },
    segment
  }
}

function findCandidate(options: FindCandidateOptions): MovementCandidate | null {
  const { state, id, position, movement, index, positions, allowDestinationOverlap, ignoredUnitIds } = options
  const target = movementTarget(state, movement)
  let best: { readonly candidate: MovementCandidate; readonly distanceSquared: number } | null = null
  for (const offset of AVOIDANCE_OFFSETS) {
    const candidate = stepCandidate({
      state,
      id,
      position,
      movement,
      target,
      offset,
      index,
      positions,
      allowDestinationOverlap,
      ignoredUnitIds
    })
    if (candidate === null) {
      continue
    }
    const distanceX = target.x - candidate.step.x
    const distanceY = target.y - candidate.step.y
    const distanceSquared = distanceX * distanceX + distanceY * distanceY
    if (best === null || distanceSquared < best.distanceSquared) {
      best = { candidate, distanceSquared }
    }
  }
  return best?.candidate ?? null
}

function blockReason(
  state: GameState,
  position: PositionData,
  movement: MovementData,
  index: SpatialIndexes
): MovementBlockReason {
  if (movement.path !== null && movement.path.length === 0) {
    return 'UNREACHABLE'
  }
  const target = movementTarget(state, movement)
  const segment = segmentFor(position, target)
  return segmentHitsBuilding(index.buildings, segment) || segmentHitsStaticObstacle(state, segment)
    ? 'UNREACHABLE'
    : 'COLLISION'
}

function emitBlockedEvent(state: GameState, id: EntityId, movement: MovementData, reason: MovementBlockReason): void {
  if (movement.blockedTicks + 1 !== MOVEMENT_BLOCK_NOTIFICATION_TICKS) {
    return
  }
  state.events.push({
    type: 'movementBlocked',
    unitId: id,
    destinationX: movement.destX,
    destinationY: movement.destY,
    reason
  })
}

function advanceUnit(options: AdvanceUnitOptions): void {
  const { state, id, position, movement, candidate, index, positions } = options
  if (candidate === null) {
    const blocked = blockedMovement(movement)
    emitBlockedEvent(state, id, movement, blockReason(state, position, movement, index))
    state.world.store(Movement).set(id, blocked)
    return
  }
  const step = candidate.step
  const nextPosition = { x: step.x, y: step.y }
  state.world.store(Position).set(id, nextPosition)
  positions.set(id, nextPosition)
  if (step.arrived) {
    const nextRoute = routeArrived(movement)
    if (nextRoute === null) {
      state.world.store(Movement).delete(id)
      return
    }
    state.world.store(Movement).set(id, nextRoute)
    return
  }
  state.world.store(Movement).set(id, {
    ...movement,
    remainderX: step.remainderX,
    remainderY: step.remainderY,
    blockedTicks: 0
  })
}

/** Advances movement with deterministic building collision and local avoidance. */
export function movementSystem(state: GameState): void {
  const index = createWorldSpatialIndex(state)
  const positions = positionMap(state)
  const movementStore = state.world.store(Movement)
  for (const id of state.world.query(Position, Movement)) {
    const position = positions.get(id)
    const movement = movementStore.get(id)
    if (position === undefined || movement === undefined) {
      continue
    }
    const prepared = prepareMovement(state, position, movement, index)
    if (prepared.path !== null && prepared.path.length === 0) {
      advanceUnit({ state, id, position, movement: prepared, candidate: null, index, positions })
      continue
    }
    const candidate = findCandidate({
      state,
      id,
      position,
      movement: prepared,
      index,
      positions,
      allowDestinationOverlap: allowsDestinationOverlap(state, id),
      ignoredUnitIds: cooperativeUnitIds(state, id, prepared)
    })
    advanceUnit({ state, id, position, movement: prepared, candidate, index, positions })
  }
}
