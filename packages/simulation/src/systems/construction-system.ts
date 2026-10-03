import { BUILDING_DEFINITIONS, unitDefinitionFor } from '@rts/game-data'
import { advanceTimedProgress } from '@rts/shared'
import { isActiveConstruction } from '../domain/building-predicates.js'
import { Building, type BuildingData } from '../ecs/building-component.js'
import { Health, Kind, Movement, Orders, Owner, Position, Production } from '../ecs/components.js'
import { removeFrontOrder } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'

function completeConstruction(
  state: GameState,
  buildingId: number,
  construction: BuildingData,
  builderId: number
): void {
  const buildings = state.world.store(Building)
  const definition = BUILDING_DEFINITIONS[construction.buildingType]
  buildings.set(buildingId, {
    ...construction,
    status: 'COMPLETED',
    progressTicks: construction.totalTicks,
    builderId: null
  })
  state.world.store(Health).set(buildingId, { current: definition.maxHp, max: definition.maxHp })
  if (definition.capabilities.canProduce || definition.capabilities.canResearch) {
    state.world.store(Production).set(buildingId, { queue: [] })
  }
  removeFrontOrder(state, builderId)
}

/** Advances only constructions whose assigned builder is at its work point. */
export function constructionSystem(state: GameState): void {
  const buildings = state.world.store(Building)
  const orders = state.world.store(Orders)
  const movements = state.world.store(Movement)
  const positions = state.world.store(Position)
  const kinds = state.world.store(Kind)
  const owners = state.world.store(Owner)
  for (const buildingId of state.world.query(Building)) {
    const construction = buildings.get(buildingId)
    if (!isActiveConstruction(construction)) {
      continue
    }
    const builderId = construction.builderId
    const builderOrder = builderId === null ? undefined : orders.get(builderId)?.queue[0]
    const builderKind = builderId === null ? undefined : kinds.get(builderId)
    const validBuilder =
      builderId !== null &&
      state.world.hasEntity(builderId) &&
      builderKind !== undefined &&
      unitDefinitionFor(builderKind).canBuild &&
      owners.get(builderId)?.owner === owners.get(buildingId)?.owner &&
      builderOrder?.type === 'BUILD' &&
      builderOrder.buildingId === buildingId &&
      positions.get(builderId) !== undefined
    if (!validBuilder) {
      buildings.set(buildingId, { ...construction, builderId: null })
      continue
    }
    const builderPosition = positions.get(builderId!)!
    const builderWorkPoint = builderOrder.type === 'BUILD' ? builderOrder.workPoint : undefined
    if (
      builderWorkPoint === undefined ||
      movements.has(builderId!) ||
      builderPosition.x !== builderWorkPoint.x ||
      builderPosition.y !== builderWorkPoint.y
    ) {
      continue
    }
    const progress = advanceTimedProgress(construction)
    if (progress.completed) {
      completeConstruction(state, buildingId, construction, builderId!)
    } else {
      buildings.set(buildingId, {
        ...construction,
        status: 'UNDER_CONSTRUCTION',
        progressTicks: progress.progressTicks
      })
    }
  }
}
