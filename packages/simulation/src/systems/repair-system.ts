import { BUILDING_DEFINITIONS, type RepairDefinition, unitDefinitionFor } from '@rts/game-data'
import { applyResourceCost, canAfford, type EntityId } from '@rts/shared'
import type { Order } from '../contracts/orders.js'
import { Building } from '../ecs/building-component.js'
import { Health, Kind, Orders, Owner, Position } from '../ecs/components.js'
import { clearMovement, setMovementDestination } from '../movement/destination.js'
import { removeFrontOrder, replaceFrontOrder } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'

type RepairOrder = Extract<Order, { readonly type: 'REPAIR' }>

function repairProfileForTarget(state: GameState, targetId: EntityId): RepairDefinition | null {
  const building = state.world.store(Building).get(targetId)
  if (building !== undefined) {
    const definition = BUILDING_DEFINITIONS[building.buildingType]
    return building.status === 'COMPLETED' && definition.mechanical ? definition.repairProfile : null
  }
  const kind = state.world.store(Kind).get(targetId)
  return kind === undefined || !unitDefinitionFor(kind).repairable ? null : unitDefinitionFor(kind).repairProfile
}

function isRepairTarget(state: GameState, targetId: EntityId, owner: number): boolean {
  const health = state.world.store(Health).get(targetId)
  const targetOwner = state.world.store(Owner).get(targetId)
  return (
    health !== undefined &&
    health.current > 0 &&
    targetOwner?.owner === owner &&
    repairProfileForTarget(state, targetId) !== null
  )
}

function updateRepair(state: GameState, workerId: EntityId, order: RepairOrder, owner: number): void {
  const workerKind = state.world.store(Kind).get(workerId)
  const repair = workerKind === undefined ? null : unitDefinitionFor(workerKind).repairProfile
  const targetId = order.targetId
  const targetPosition = state.world.store(Position).get(targetId)
  const workerPosition = state.world.store(Position).get(workerId)
  const health = state.world.store(Health).get(targetId)
  const player = state.players.find((candidate) => candidate.id === owner)
  if (
    repair === null ||
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
  if (progressTicks < repair.ticksPerStep) {
    replaceFrontOrder(state, workerId, { ...order, progressTicks })
    return
  }
  if (!canAfford(player.resources, repair.cost)) {
    state.events.push({ type: 'repairStopped', workerId, targetId, reason: 'NO_GOLD' })
    clearMovement(state, workerId)
    removeFrontOrder(state, workerId)
    return
  }
  applyResourceCost(player.resources, repair.cost, -1)
  const current = Math.min(health.max, health.current + repair.healthPerStep)
  state.world.store(Health).set(targetId, { ...health, current })
  if (current >= health.max) {
    clearMovement(state, workerId)
    removeFrontOrder(state, workerId)
    return
  }
  replaceFrontOrder(state, workerId, { ...order, progressTicks: 0 })
}

export function repairSystem(state: GameState): void {
  const orders = state.world.store(Orders)
  const owners = state.world.store(Owner)
  for (const workerId of state.world.query(Orders, Owner)) {
    const kind = state.world.store(Kind).get(workerId)
    const order = orders.get(workerId)?.queue[0]
    if (order?.type === 'REPAIR' && kind !== undefined && unitDefinitionFor(kind).canRepair) {
      updateRepair(state, workerId, order, owners.get(workerId)!.owner)
    }
  }
}
