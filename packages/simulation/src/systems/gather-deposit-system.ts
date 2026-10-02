import { unitDefinitionFor } from '@rts/game-data'
import {
  addPlayerResource,
  distSquaredFixed,
  type EntityId,
  type Fixed,
  type PlayerId,
  type ResourceType,
  resourceTypeForKind
} from '@rts/shared'
import type { Order } from '../contracts/orders.js'
import { isCloserCandidate, isCompletedBase } from '../domain/building-predicates.js'
import { Building } from '../ecs/building-component.js'
import { Cargo, Kind, Movement, Orders, Owner, Position } from '../ecs/components.js'
import { clearMovement, setMovementDestination } from '../movement/destination.js'
import { removeFrontOrder, replaceFrontOrder } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'

type GatherOrder = Extract<Order, { readonly type: 'GATHER' }>
type DepositOrder = Extract<Order, { readonly type: 'DEPOSIT' }>

function nearestOwnedBase(state: GameState, owner: PlayerId, x: Fixed, y: Fixed): EntityId | null {
  const buildings = state.world.store(Building)
  const owners = state.world.store(Owner)
  const positions = state.world.store(Position)
  let nearest: EntityId | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const entityId of state.world.query(Building, Owner, Position)) {
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
  if (source === null || source.remaining <= 0) {
    removeFrontOrder(state, workerId)
    return
  }
  replaceFrontOrder(state, workerId, { ...order, baseId: null, phase: 'TO_RESOURCE', progressTicks: 0 })
  setMovementDestination(state, workerId, source.x, source.y)
}

function isValidOwnedBase(state: GameState, baseId: EntityId, owner: PlayerId): boolean {
  return (
    isCompletedBase(state.world.store(Building).get(baseId)) &&
    state.world.store(Owner).get(baseId)?.owner === owner &&
    state.world.store(Position).get(baseId) !== undefined
  )
}

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

function updateGathering(state: GameState, workerId: EntityId, order: GatherOrder, owner: PlayerId): void {
  const source = gatherSource(state, order)
  const cargo = state.world.store(Cargo).get(workerId)!
  if (cargo.amount > 0) {
    beginReturn(state, workerId, order, owner)
    return
  }
  if (source === null || source.remaining <= 0) {
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
  const remainingCapacity = Math.max(0, cargo.capacity - cargo.amount)
  const amount = Math.min(source.harvestAmount, remainingCapacity, source.remaining)
  if (amount <= 0) {
    removeFrontOrder(state, workerId)
    return
  }
  const remaining = harvestSource(state, order, amount)
  if (remaining === null) {
    removeFrontOrder(state, workerId)
    return
  }
  state.world.store(Cargo).set(workerId, { ...cargo, amount, resourceType: source.resourceType })
  const nextOrder = { ...order, phase: 'HARVESTING' as const, progressTicks: 0 }
  if (amount >= remainingCapacity || remaining === 0) {
    beginReturn(state, workerId, nextOrder, owner)
  } else {
    replaceFrontOrder(state, workerId, nextOrder)
  }
}

function updateWorkerOrder(state: GameState, workerId: EntityId, order: Order | undefined, owner: PlayerId): void {
  const kind = state.world.store(Kind).get(workerId)
  const definition = kind === undefined ? undefined : unitDefinitionFor(kind)
  if (order?.type === 'DEPOSIT' && definition?.acceptsDeposit && state.world.store(Cargo).has(workerId)) {
    updateDeposit(state, workerId, order, owner)
    return
  }
  if (order?.type !== 'GATHER' || definition?.canGather !== true || !state.world.store(Cargo).has(workerId)) {
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

export function gatherDepositSystem(state: GameState): void {
  const owners = state.world.store(Owner)
  const orders = state.world.store(Orders)
  for (const workerId of state.world.query(Orders, Owner)) {
    const owner = owners.get(workerId)?.owner
    if (owner !== undefined) {
      updateWorkerOrder(state, workerId, orders.get(workerId)?.queue[0], owner)
    }
  }
}
