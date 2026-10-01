import { BUILDING_DEFINITIONS } from '@rts/game-data'
import {
  addPlayerResource,
  distSquaredFixed,
  type EntityId,
  type Fixed,
  type PlayerId,
  type ResourceType,
  resourceTypeForKind,
  spendPlayerResource
} from '@rts/shared'
import type { Order } from '../contracts/orders.js'
import { REPAIR_HP_PER_STEP, REPAIR_RESOURCE_COST, REPAIR_TICKS_PER_STEP } from '../data/economy-rules.js'
import { unitStatsFor } from '../data/unit-stats.js'
import { isActiveConstruction, isCloserCandidate, isCompletedBase } from '../domain/building-predicates.js'
import { Building } from '../ecs/building-component.js'
import { Cargo, Health, Kind, Movement, Orders, Owner, Position } from '../ecs/components.js'
import { clearMovement, setMovementDestination } from '../movement/destination.js'
import { removeFrontOrder, replaceFrontOrder } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'

type GatherOrder = Extract<Order, { readonly type: 'GATHER' }>
type DepositOrder = Extract<Order, { readonly type: 'DEPOSIT' }>
type RepairOrder = Extract<Order, { readonly type: 'REPAIR' }>

function nearestOwnedBase(state: GameState, owner: PlayerId, x: Fixed, y: Fixed): EntityId | null {
  const buildings = state.world.store(Building)
  const owners = state.world.store(Owner)
  const positions = state.world.store(Position)
  let nearest: EntityId | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const entityId of state.world.aliveIds()) {
    const position = positions.get(entityId)
    const building = buildings.get(entityId)
    if (!isCompletedBase(building) || owners.get(entityId)?.owner !== owner || position === undefined) {
      continue
    }
    const distance = distSquaredFixed(x, y, position.x, position.y)
    if (isCloserCandidate(distance, entityId, nearestDistance, nearest)) {
      nearest = entityId
      nearestDistance = distance
    }
  }
  return nearest
}

function beginReturn(state: GameState, workerId: EntityId, order: GatherOrder, owner: PlayerId): void {
  const position = state.world.store(Position).get(workerId)!
  const baseId = nearestOwnedBase(state, owner, position.x, position.y)
  if (baseId === null) {
    clearMovement(state, workerId)
    replaceFrontOrder(state, workerId, { ...order, baseId: null, phase: 'WAITING_FOR_BASE', progressTicks: 0 })
    return
  }
  const basePosition = state.world.store(Position).get(baseId)!
  replaceFrontOrder(state, workerId, { ...order, baseId, phase: 'TO_BASE', progressTicks: 0 })
  setMovementDestination(state, workerId, basePosition.x, basePosition.y)
}

function resumeGathering(state: GameState, workerId: EntityId, order: GatherOrder): void {
  const source = gatherSource(state, order)
  if (source === null || source.remaining < source.harvestAmount) {
    removeFrontOrder(state, workerId)
    return
  }
  replaceFrontOrder(state, workerId, { ...order, baseId: null, phase: 'TO_RESOURCE', progressTicks: 0 })
  setMovementDestination(state, workerId, source.x, source.y)
}

/** A Base that can accept a deposit: owned completed Base with a position. */
function isValidOwnedBase(state: GameState, baseId: EntityId, owner: PlayerId): boolean {
  return (
    isCompletedBase(state.world.store(Building).get(baseId)) &&
    state.world.store(Owner).get(baseId)?.owner === owner &&
    state.world.store(Position).get(baseId) !== undefined
  )
}

/** Credits typed worker cargo to its matching player wallet and empties it. */
function creditCargo(state: GameState, workerId: EntityId, owner: PlayerId): void {
  const cargo = state.world.store(Cargo).get(workerId)!
  const player = state.players.find((candidate) => candidate.id === owner)!
  if (cargo.resourceType !== null) {
    addPlayerResource(player.resources, cargo.resourceType, cargo.amount)
  }
  state.world.store(Cargo).set(workerId, { amount: 0, capacity: cargo.capacity, resourceType: null })
}

function depositCargo(state: GameState, workerId: EntityId, order: GatherOrder, owner: PlayerId): void {
  creditCargo(state, workerId, owner)
  resumeGathering(state, workerId, order)
}

function updateReturn(state: GameState, workerId: EntityId, order: GatherOrder, owner: PlayerId): void {
  const baseId = order.baseId
  if (baseId === null || !isValidOwnedBase(state, baseId, owner)) {
    beginReturn(state, workerId, order, owner)
    return
  }
  const basePosition = state.world.store(Position).get(baseId)!
  if (state.world.store(Movement).has(workerId)) {
    return
  }
  const workerPosition = state.world.store(Position).get(workerId)!
  if (workerPosition.x !== basePosition.x || workerPosition.y !== basePosition.y) {
    setMovementDestination(state, workerId, basePosition.x, basePosition.y)
    return
  }
  depositCargo(state, workerId, order, owner)
}

/**
 * Manual deposit: walk to the ordered Base, credit the carried resource on
 * arrival, and end the order (the worker stays idle instead of resuming the
 * previous Mine). An invalidated Base drops the order without a deposit.
 */
function updateDeposit(state: GameState, workerId: EntityId, order: DepositOrder, owner: PlayerId): void {
  const baseId = order.buildingId
  if (!isValidOwnedBase(state, baseId, owner)) {
    clearMovement(state, workerId)
    removeFrontOrder(state, workerId)
    return
  }
  if (state.world.store(Movement).has(workerId)) {
    return
  }
  const basePosition = state.world.store(Position).get(baseId)!
  const workerPosition = state.world.store(Position).get(workerId)!
  if (workerPosition.x !== basePosition.x || workerPosition.y !== basePosition.y) {
    setMovementDestination(state, workerId, basePosition.x, basePosition.y)
    return
  }
  creditCargo(state, workerId, owner)
  removeFrontOrder(state, workerId)
}

function updateGathering(state: GameState, workerId: EntityId, order: GatherOrder, owner: PlayerId): void {
  const source = gatherSource(state, order)
  const cargo = state.world.store(Cargo).get(workerId)!
  if (cargo.amount > 0) {
    beginReturn(state, workerId, order, owner)
    return
  }
  if (source === null || source.remaining < source.harvestAmount) {
    removeFrontOrder(state, workerId)
    return
  }
  const workerPosition = state.world.store(Position).get(workerId)!
  if (workerPosition.x !== source.x || workerPosition.y !== source.y) {
    replaceFrontOrder(state, workerId, { ...order, baseId: null, phase: 'TO_RESOURCE', progressTicks: 0 })
    setMovementDestination(state, workerId, source.x, source.y)
    return
  }
  const progressTicks = order.progressTicks + 1
  if (progressTicks < source.harvestTicks) {
    replaceFrontOrder(state, workerId, { ...order, phase: 'HARVESTING', progressTicks })
    return
  }
  const amount = source.harvestAmount
  const remaining = harvestSource(state, order, amount)
  if (remaining === null) {
    removeFrontOrder(state, workerId)
    return
  }
  state.world.store(Cargo).set(workerId, { ...cargo, amount, resourceType: source.resourceType })
  const nextOrder = { ...order, phase: 'HARVESTING' as const, progressTicks: 0 }
  if (amount >= cargo.capacity || remaining === 0) {
    beginReturn(state, workerId, nextOrder, owner)
  } else {
    replaceFrontOrder(state, workerId, nextOrder)
  }
}

interface GatherSource {
  readonly x: Fixed
  readonly y: Fixed
  readonly remaining: number
  readonly harvestAmount: number
  readonly harvestTicks: number
  readonly resourceType: ResourceType
}

function gatherSource(state: GameState, order: GatherOrder): GatherSource | null {
  const resource = state.resources.catalog.entry(order.resourceId)
  const remaining = state.resources.amount(order.resourceId)
  if (resource === undefined || remaining === undefined) {
    return null
  }
  return {
    x: resource.x,
    y: resource.y,
    remaining,
    harvestAmount: resource.harvestAmount,
    harvestTicks: resource.harvestTicks,
    resourceType: resourceTypeForKind(resource.kind)
  }
}

function harvestSource(state: GameState, order: GatherOrder, amount: number): number | null {
  const harvested = state.resources.harvest(order.resourceId, amount)
  if (harvested !== amount) {
    return null
  }
  return state.resources.amount(order.resourceId) ?? 0
}

function isRepairTarget(state: GameState, targetId: EntityId, owner: PlayerId): boolean {
  const health = state.world.store(Health).get(targetId)
  const targetOwner = state.world.store(Owner).get(targetId)
  if (health === undefined || health.current <= 0 || targetOwner?.owner !== owner) {
    return false
  }
  const building = state.world.store(Building).get(targetId)
  if (building !== undefined) {
    return building.status === 'COMPLETED' && BUILDING_DEFINITIONS[building.buildingType].mechanical
  }
  const kind = state.world.store(Kind).get(targetId)
  return kind !== undefined && unitStatsFor(kind).mechanical
}

function updateRepair(state: GameState, workerId: EntityId, order: RepairOrder, owner: PlayerId): void {
  const targetId = order.targetId
  const targetPosition = state.world.store(Position).get(targetId)
  const workerPosition = state.world.store(Position).get(workerId)
  const health = state.world.store(Health).get(targetId)
  const player = state.players.find((candidate) => candidate.id === owner)
  if (
    targetPosition === undefined ||
    workerPosition === undefined ||
    health === undefined ||
    player === undefined ||
    !isRepairTarget(state, targetId, owner)
  ) {
    clearMovement(state, workerId)
    removeFrontOrder(state, workerId)
    return
  }
  if (health.current >= health.max) {
    clearMovement(state, workerId)
    removeFrontOrder(state, workerId)
    return
  }
  if (workerPosition.x !== targetPosition.x || workerPosition.y !== targetPosition.y) {
    setMovementDestination(state, workerId, targetPosition.x, targetPosition.y)
    return
  }
  const progressTicks = order.progressTicks + 1
  if (progressTicks < REPAIR_TICKS_PER_STEP) {
    replaceFrontOrder(state, workerId, { ...order, progressTicks })
    return
  }
  if (!spendPlayerResource(player.resources, 'GOLD', REPAIR_RESOURCE_COST)) {
    state.events.push({ type: 'repairStopped', workerId, targetId, reason: 'NO_GOLD' })
    clearMovement(state, workerId)
    removeFrontOrder(state, workerId)
    return
  }
  const current = Math.min(health.max, health.current + REPAIR_HP_PER_STEP)
  state.world.store(Health).set(targetId, { ...health, current })
  if (current >= health.max) {
    clearMovement(state, workerId)
    removeFrontOrder(state, workerId)
    return
  }
  replaceFrontOrder(state, workerId, { ...order, progressTicks: 0 })
}

function updateWorkerOrder(state: GameState, workerId: EntityId, order: Order | undefined, owner: PlayerId): void {
  const kinds = state.world.store(Kind)
  if (order?.type === 'REPAIR') {
    if (kinds.get(workerId) === 'pawn') {
      updateRepair(state, workerId, order, owner)
    }
    return
  }
  if (order?.type === 'DEPOSIT') {
    if (kinds.get(workerId) === 'pawn' && state.world.store(Cargo).get(workerId) !== undefined) {
      updateDeposit(state, workerId, order, owner)
    }
    return
  }
  if (order?.type !== 'GATHER' || kinds.get(workerId) !== 'pawn') {
    return
  }
  if (state.world.store(Cargo).get(workerId) === undefined) {
    return
  }
  if (order.phase === 'WAITING_FOR_BASE') {
    beginReturn(state, workerId, order, owner)
    return
  }
  if (order.phase === 'TO_BASE') {
    updateReturn(state, workerId, order, owner)
    return
  }
  if (order.phase === 'TO_RESOURCE' && state.world.store(Movement).has(workerId)) {
    return
  }
  updateGathering(state, workerId, order, owner)
}

function updateConstruction(state: GameState): void {
  const buildings = state.world.store(Building)
  const orders = state.world.store(Orders)
  const movements = state.world.store(Movement)
  const positions = state.world.store(Position)
  const kinds = state.world.store(Kind)
  const owners = state.world.store(Owner)
  for (const buildingId of state.world.aliveIds()) {
    const construction = buildings.get(buildingId)
    if (!isActiveConstruction(construction)) {
      continue
    }
    const builderId = construction.builderId
    const builderOrder = builderId === null ? undefined : orders.get(builderId)?.queue[0]
    const validBuilder =
      builderId !== null &&
      state.world.hasEntity(builderId) &&
      kinds.get(builderId) === 'pawn' &&
      owners.get(builderId)?.owner === owners.get(buildingId)?.owner &&
      builderOrder?.type === 'BUILD' &&
      builderOrder.buildingId === buildingId &&
      positions.get(builderId) !== undefined
    if (!validBuilder) {
      buildings.set(buildingId, { ...construction, builderId: null })
      continue
    }
    const builderPosition = positions.get(builderId)!
    const builderWorkPoint = builderOrder?.type === 'BUILD' ? builderOrder.workPoint : undefined
    if (
      builderWorkPoint === undefined ||
      movements.has(builderId) ||
      builderPosition.x !== builderWorkPoint.x ||
      builderPosition.y !== builderWorkPoint.y
    ) {
      continue
    }
    const progressTicks = Math.min(construction.totalTicks, construction.progressTicks + 1)
    if (progressTicks >= construction.totalTicks) {
      buildings.set(buildingId, { ...construction, status: 'COMPLETED', progressTicks, builderId: null })
      const maxHp = BUILDING_DEFINITIONS[construction.buildingType].maxHp
      state.world.store(Health).set(buildingId, { current: maxHp, max: maxHp })
      removeFrontOrder(state, builderId)
    } else {
      buildings.set(buildingId, {
        ...construction,
        status: 'UNDER_CONSTRUCTION',
        progressTicks
      })
    }
  }
}

/** Advances deterministic resource gathering, return, and deposit work. */
export function economySystem(state: GameState): void {
  const owners = state.world.store(Owner)
  for (const workerId of state.world.aliveIds()) {
    const owner = owners.get(workerId)?.owner
    if (owner === undefined) {
      continue
    }
    updateWorkerOrder(state, workerId, state.world.store(Orders).get(workerId)?.queue[0], owner)
  }
  updateConstruction(state)
}
