import { distSquaredFixed, type EntityId, type Fixed, type PlayerId } from '@rts/shared'
import { UNIT_SPEED_TILES_PER_SECOND } from '../commands/move.js'
import type { Order } from '../contracts/orders.js'
import { GATHER_TICKS_PER_MINERAL } from '../data/economy-rules.js'
import { Barracks, Base, Cargo, Kind, MineralNode, Movement, Orders, Owner, Position } from '../ecs/components.js'
import { Construction } from '../ecs/construction-component.js'
import type { GameState } from '../state/state.js'

type GatherOrder = Extract<Order, { readonly type: 'GATHER' }>

function replaceFrontOrder(state: GameState, workerId: EntityId, order: GatherOrder): void {
  const orders = state.world.store(Orders)
  const queue = orders.get(workerId)?.queue ?? []
  orders.set(workerId, { queue: [order, ...queue.slice(1)] })
}

function clearFrontOrder(state: GameState, workerId: EntityId): void {
  const orders = state.world.store(Orders)
  const queue = orders.get(workerId)?.queue ?? []
  const remaining = queue.slice(1)
  if (remaining.length === 0) {
    orders.delete(workerId)
  } else {
    orders.set(workerId, { queue: remaining })
  }
}

function moveWorker(state: GameState, workerId: EntityId, x: Fixed, y: Fixed): void {
  const position = state.world.store(Position).get(workerId)
  const movements = state.world.store(Movement)
  if (position?.x === x && position.y === y) {
    movements.delete(workerId)
    return
  }
  movements.set(workerId, {
    speedTilesPerSecond: UNIT_SPEED_TILES_PER_SECOND,
    destX: x,
    destY: y,
    remainderX: 0,
    remainderY: 0
  })
}

function nearestOwnedBase(state: GameState, owner: PlayerId, x: Fixed, y: Fixed): EntityId | null {
  const bases = state.world.store(Base)
  const owners = state.world.store(Owner)
  const positions = state.world.store(Position)
  let nearest: EntityId | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const entityId of state.world.aliveIds()) {
    const position = positions.get(entityId)
    if (!bases.has(entityId) || owners.get(entityId)?.owner !== owner || position === undefined) {
      continue
    }
    const distance = distSquaredFixed(x, y, position.x, position.y)
    if (distance < nearestDistance) {
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
    state.world.store(Movement).delete(workerId)
    replaceFrontOrder(state, workerId, { ...order, baseId: null, phase: 'WAITING_FOR_BASE', progressTicks: 0 })
    return
  }
  const basePosition = state.world.store(Position).get(baseId)!
  replaceFrontOrder(state, workerId, { ...order, baseId, phase: 'TO_BASE', progressTicks: 0 })
  moveWorker(state, workerId, basePosition.x, basePosition.y)
}

function resumeGathering(state: GameState, workerId: EntityId, order: GatherOrder): void {
  const node = state.world.store(MineralNode).get(order.nodeId)
  const nodePosition = state.world.store(Position).get(order.nodeId)
  if (node === undefined || node.remaining === 0 || nodePosition === undefined) {
    clearFrontOrder(state, workerId)
    return
  }
  replaceFrontOrder(state, workerId, { ...order, baseId: null, phase: 'TO_NODE', progressTicks: 0 })
  moveWorker(state, workerId, nodePosition.x, nodePosition.y)
}

function depositCargo(state: GameState, workerId: EntityId, order: GatherOrder, owner: PlayerId): void {
  const cargo = state.world.store(Cargo).get(workerId)!
  const player = state.players.find((candidate) => candidate.id === owner)!
  player.gold += cargo.amount
  state.world.store(Cargo).set(workerId, { ...cargo, amount: 0 })
  resumeGathering(state, workerId, order)
}

function updateReturn(state: GameState, workerId: EntityId, order: GatherOrder, owner: PlayerId): void {
  const baseId = order.baseId
  const basePosition = baseId === null ? undefined : state.world.store(Position).get(baseId)
  const validBase =
    baseId !== null &&
    state.world.store(Base).has(baseId) &&
    state.world.store(Owner).get(baseId)?.owner === owner &&
    basePosition !== undefined
  if (!validBase) {
    beginReturn(state, workerId, order, owner)
    return
  }
  if (state.world.store(Movement).has(workerId)) {
    return
  }
  const workerPosition = state.world.store(Position).get(workerId)!
  if (workerPosition.x !== basePosition.x || workerPosition.y !== basePosition.y) {
    moveWorker(state, workerId, basePosition.x, basePosition.y)
    return
  }
  depositCargo(state, workerId, order, owner)
}

function updateGathering(state: GameState, workerId: EntityId, order: GatherOrder, owner: PlayerId): void {
  const nodes = state.world.store(MineralNode)
  const node = nodes.get(order.nodeId)
  const nodePosition = state.world.store(Position).get(order.nodeId)
  const cargo = state.world.store(Cargo).get(workerId)!
  if (cargo.amount >= cargo.capacity) {
    beginReturn(state, workerId, order, owner)
    return
  }
  if (node === undefined || node.remaining === 0 || nodePosition === undefined) {
    if (cargo.amount > 0) {
      beginReturn(state, workerId, order, owner)
    } else {
      clearFrontOrder(state, workerId)
    }
    return
  }
  const workerPosition = state.world.store(Position).get(workerId)!
  if (workerPosition.x !== nodePosition.x || workerPosition.y !== nodePosition.y) {
    replaceFrontOrder(state, workerId, { ...order, baseId: null, phase: 'TO_NODE', progressTicks: 0 })
    moveWorker(state, workerId, nodePosition.x, nodePosition.y)
    return
  }
  const progressTicks = order.progressTicks + 1
  if (progressTicks < GATHER_TICKS_PER_MINERAL) {
    replaceFrontOrder(state, workerId, { ...order, phase: 'GATHERING', progressTicks })
    return
  }
  const amount = cargo.amount + 1
  const remaining = node.remaining - 1
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
  const constructions = state.world.store(Construction)
  const orders = state.world.store(Orders)
  const movements = state.world.store(Movement)
  const positions = state.world.store(Position)
  const kinds = state.world.store(Kind)
  const owners = state.world.store(Owner)
  const bases = state.world.store(Base)
  const barracks = state.world.store(Barracks)
  for (const buildingId of state.world.aliveIds()) {
    const construction = constructions.get(buildingId)
    if (construction === undefined || construction.status === 'COMPLETED') {
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
      constructions.set(buildingId, { ...construction, builderId: null })
      continue
    }
    const builderPosition = positions.get(builderId)!
    const buildingPosition = positions.get(buildingId)
    if (
      buildingPosition === undefined ||
      movements.has(builderId) ||
      builderPosition.x !== buildingPosition.x ||
      builderPosition.y !== buildingPosition.y
    ) {
      continue
    }
    const progressTicks = Math.min(construction.totalTicks, construction.progressTicks + 1)
    if (progressTicks >= construction.totalTicks) {
      constructions.set(buildingId, { ...construction, status: 'COMPLETED', progressTicks, builderId: null })
      if (construction.buildingType === 'BASE') {
        bases.set(buildingId, {})
      } else {
        barracks.set(buildingId, {})
      }
      const queue = orders.get(builderId)?.queue.slice(1) ?? []
      if (queue.length === 0) {
        orders.delete(builderId)
      } else {
        orders.set(builderId, { queue })
      }
    } else {
      constructions.set(buildingId, {
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
    if (order?.type !== 'GATHER') {
      continue
    }
    const owner = owners.get(workerId)?.owner
    if (owner === undefined || kinds.get(workerId) !== 'pawn' || cargo.get(workerId) === undefined) {
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
