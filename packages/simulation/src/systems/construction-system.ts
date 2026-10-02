import { BUILDING_DEFINITIONS, unitDefinitionFor } from '@rts/game-data'
import { advanceTimedProgress } from '@rts/shared'
import { isActiveConstruction } from '../domain/building-predicates.js'
import { Building } from '../ecs/building-component.js'
import { Health, Kind, Movement, Orders, Owner, Position } from '../ecs/components.js'
import { removeFrontOrder } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'

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
      buildings.set(buildingId, {
        ...construction,
        status: 'COMPLETED',
        progressTicks: progress.progressTicks,
        builderId: null
      })
      const maxHp = BUILDING_DEFINITIONS[construction.buildingType].maxHp
      state.world.store(Health).set(buildingId, { current: maxHp, max: maxHp })
      removeFrontOrder(state, builderId!)
    } else {
      buildings.set(buildingId, {
        ...construction,
        status: 'UNDER_CONSTRUCTION',
        progressTicks: progress.progressTicks
      })
    }
  }
}
