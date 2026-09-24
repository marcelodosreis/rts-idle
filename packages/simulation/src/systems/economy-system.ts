import { distSquaredFixed, type EntityId, type Fixed, type PlayerId } from '@rts/shared'
import type { Order } from '../contracts/orders.js'
import { GATHER_TICKS_PER_BATCH, MINERAL_CARGO_CAPACITY } from '../data/economy-rules.js'
import { isActiveConstruction, isCloserCandidate, isCompletedBase } from '../domain/building-predicates.js'
import { Building } from '../ecs/building-component.js'
import { Cargo, Kind, MineralNode, Movement, Orders, Owner, Position } from '../ecs/components.js'
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
  const node = state.world.store(MineralNode).get(order.nodeId)
  const nodePosition = state.world.store(Position).get(order.nodeId)
  if (node === undefined || node.remaining === 0 || nodePosition === undefined) {
    removeFrontOrder(state, workerId)
    return
  }
  replaceFrontOrder(state, workerId, { ...order, baseId: null, phase: 'TO_NODE', progressTicks: 0 })
  setMovementDestination(state, workerId, nodePosition.x, nodePosition.y)
}

/** A Base that can accept a deposit: owned completed Base with a position. */
function isValidOwnedBase(state: GameState, baseId: EntityId, owner: PlayerId): boolean {
  return (
    isCompletedBase(state.world.store(Building).get(baseId)) &&
    state.world.store(Owner).get(baseId)?.owner === owner &&
    state.world.store(Position).get(baseId) !== undefined
  )
}

/** Credits a worker's carried minerals to its player and empties the cargo. */
function creditCargo(state: GameState, workerId: EntityId, owner: PlayerId): void {
  const cargo = state.world.store(Cargo).get(workerId)!
  const player = state.players.find((candidate) => candidate.id === owner)!
  player.gold += cargo.amount
  state.world.store(Cargo).set(workerId, { ...cargo, amount: 0 })
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
 * Manual deposit: walk to the ordered Base, credit the carried minerals on
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
  const nodes = state.world.store(MineralNode)
  const node = nodes.get(order.nodeId)
  const nodePosition = state.world.store(Position).get(order.nodeId)
  const cargo = state.world.store(Cargo).get(workerId)!
  if (cargo.amount > 0) {
    beginReturn(state, workerId, order, owner)
    return
  }
  if (
    node === undefined ||
    node.remaining < MINERAL_CARGO_CAPACITY ||
    node.remaining % MINERAL_CARGO_CAPACITY !== 0 ||
    nodePosition === undefined
  ) {
    removeFrontOrder(state, workerId)
    return
  }
  const workerPosition = state.world.store(Position).get(workerId)!
  if (workerPosition.x !== nodePosition.x || workerPosition.y !== nodePosition.y) {
    replaceFrontOrder(state, workerId, { ...order, baseId: null, phase: 'TO_NODE', progressTicks: 0 })
    setMovementDestination(state, workerId, nodePosition.x, nodePosition.y)
    return
  }
  const progressTicks = order.progressTicks + 1
  if (progressTicks < GATHER_TICKS_PER_BATCH) {
    replaceFrontOrder(state, workerId, { ...order, phase: 'GATHERING', progressTicks })
    return
  }
  const amount = MINERAL_CARGO_CAPACITY
  const remaining = node.remaining - MINERAL_CARGO_CAPACITY
  state.world.store(Cargo).set(workerId, { ...cargo, amount })
  nodes.set(order.nodeId, { remaining })
  const nextOrder = { ...order, phase: 'GATHERING' as const, progressTicks: 0 }
  if (amount >= cargo.capacity || remaining === 0) {
    beginReturn(state, workerId, nextOrder, owner)
  } else {
    replaceFrontOrder(state, workerId, nextOrder)
  }
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

/** Advances deterministic mineral gathering, return, and deposit work. */
export function economySystem(state: GameState): void {
  const orders = state.world.store(Orders)
  const movements = state.world.store(Movement)
  const owners = state.world.store(Owner)
  const cargo = state.world.store(Cargo)
  const kinds = state.world.store(Kind)
  for (const workerId of state.world.aliveIds()) {
    const order = orders.get(workerId)?.queue[0]
    const owner = owners.get(workerId)?.owner
    if (owner === undefined) {
      continue
    }
    if (order?.type === 'DEPOSIT') {
      if (kinds.get(workerId) === 'pawn' && cargo.get(workerId) !== undefined) {
        updateDeposit(state, workerId, order, owner)
      }
      continue
    }
    if (order?.type !== 'GATHER') {
      continue
    }
    if (kinds.get(workerId) !== 'pawn' || cargo.get(workerId) === undefined) {
      continue
    }
    if (order.phase === 'WAITING_FOR_BASE') {
      beginReturn(state, workerId, order, owner)
      continue
    }
    if (order.phase === 'TO_BASE') {
      updateReturn(state, workerId, order, owner)
      continue
    }
    if (order.phase === 'TO_NODE' && movements.has(workerId)) {
      continue
    }
    updateGathering(state, workerId, order, owner)
  }
  updateConstruction(state)
}
