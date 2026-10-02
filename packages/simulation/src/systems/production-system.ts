import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { advanceTimedProgress, fixedToTiles, type ResearchType, tilesToFixed } from '@rts/shared'
import { effectiveCargoCapacity, refreshEconomyResearch } from '../domain/research-effects.js'
import { Building } from '../ecs/building-component.js'
import {
  Cargo,
  isResearchProductionItem,
  Owner,
  Position,
  Production,
  type ProductionItem,
  type UnitProductionItem
} from '../ecs/components.js'
import { createUnitEntity } from '../ecs/create-unit.js'
import { setMovementDestination } from '../movement/destination.js'
import type { GameState } from '../state/state.js'

function spawnPosition(state: GameState, producerId: number): { readonly x: number; readonly y: number } | null {
  const building = state.world.store(Building).get(producerId)
  if (building === undefined) {
    return null
  }
  const x = tilesToFixed(building.footprint.x + building.footprint.width)
  const y = tilesToFixed(building.footprint.y)
  const tileX = fixedToTiles(x)
  const tileY = fixedToTiles(y)
  if (tileX < 0 || tileY < 0 || tileX >= state.mapBounds.width || tileY >= state.mapBounds.height) {
    return null
  }
  if (state.mapBounds.invalidTiles?.some((tile) => tile.x === tileX && tile.y === tileY)) {
    return null
  }
  if (
    state.world.query(Building).some((id) => {
      if (id === producerId) {
        return false
      }
      const other = state.world.store(Building).get(id)
      return (
        other !== undefined &&
        tileX >= other.footprint.x &&
        tileX < other.footprint.x + other.footprint.width &&
        tileY >= other.footprint.y &&
        tileY < other.footprint.y + other.footprint.height
      )
    })
  ) {
    return null
  }
  if (
    state.world
      .query(Position)
      .some(
        (id) =>
          id !== producerId &&
          state.world.store(Position).get(id)?.x === x &&
          state.world.store(Position).get(id)?.y === y
      )
  ) {
    return null
  }
  return { x, y }
}

function createUnit(state: GameState, producerId: number, item: UnitProductionItem): boolean {
  const position = spawnPosition(state, producerId)
  if (position === null) {
    return false
  }
  const owner = state.world.store(Owner).get(producerId)
  if (owner === undefined) {
    return false
  }
  const id = state.nextEntityId
  state.nextEntityId += 1
  createUnitEntity(state.world, {
    id,
    x: position.x,
    y: position.y,
    owner: owner.owner,
    kind: item.unitKind
  })
  const cargo = state.world.store(Cargo).get(id)
  if (cargo !== undefined) {
    state.world.store(Cargo).set(id, { ...cargo, capacity: effectiveCargoCapacity(state, id, cargo.capacity) })
  }
  const rallyPoint = state.world.store(Building).get(producerId)?.rallyPoint ?? null
  if (rallyPoint !== null) {
    setMovementDestination(state, id, rallyPoint.x, rallyPoint.y)
  }
  return true
}

function releaseSupply(state: GameState, ownerId: number, item: ProductionItem): void {
  if (isResearchProductionItem(item)) {
    return
  }
  const player = state.players.find((candidate) => candidate.id === ownerId)
  if (player === undefined) {
    throw new Error(`production: owner ${ownerId} disappeared`)
  }
  player.reservedSupply -= item.reservedSupply
  player.usedSupply += item.reservedSupply
}

function completeResearch(state: GameState, ownerId: number, researchType: ResearchType): void {
  const player = state.players.find((candidate) => candidate.id === ownerId)
  if (player === undefined) {
    throw new Error(`production: owner ${ownerId} disappeared`)
  }
  if (!player.completedResearch.includes(researchType)) {
    player.completedResearch = [...player.completedResearch, researchType]
  }
}

function advanceResearchQueue(
  state: GameState,
  producerId: number,
  ownerId: number,
  queue: readonly ProductionItem[]
): void {
  const first = queue[0]
  if (first === undefined || !isResearchProductionItem(first)) {
    return
  }
  const progress = advanceTimedProgress(first)
  if (!progress.completed) {
    state.world.store(Production).set(producerId, {
      queue: [{ ...first, progressTicks: progress.progressTicks, status: 'ACTIVE' }, ...queue.slice(1)]
    })
    return
  }
  completeResearch(state, ownerId, first.researchType)
  refreshEconomyResearch(state, ownerId)
  const next = queue.slice(1)
  state.world.store(Production).set(producerId, {
    queue: next.length === 0 ? [] : [{ ...next[0]!, status: 'ACTIVE' }, ...next.slice(1)]
  })
}

function advanceQueue(state: GameState, producerId: number, ownerId: number, queue: readonly ProductionItem[]): void {
  const first = queue[0]
  if (first === undefined) {
    return
  }
  if (isResearchProductionItem(first)) {
    advanceResearchQueue(state, producerId, ownerId, queue)
    return
  }
  if (first.status === 'COMPLETED_WAITING') {
    if (!createUnit(state, producerId, first)) {
      return
    }
    releaseSupply(state, ownerId, first)
    const next = queue.slice(1)
    state.world.store(Production).set(producerId, {
      queue: next.length === 0 ? [] : [{ ...next[0]!, status: 'ACTIVE' }, ...next.slice(1)]
    })
    return
  }
  const player = state.players.find((candidate) => candidate.id === ownerId)
  if (player === undefined || player.usedSupply + player.reservedSupply > player.supplyCap) {
    return
  }
  const progress = advanceTimedProgress(first)
  if (!progress.completed) {
    state.world.store(Production).set(producerId, {
      queue: [{ ...first, progressTicks: progress.progressTicks, status: 'ACTIVE' }, ...queue.slice(1)]
    })
    return
  }
  state.world.store(Production).set(producerId, {
    queue: [{ ...first, progressTicks: progress.progressTicks, status: 'COMPLETED_WAITING' }, ...queue.slice(1)]
  })
}

function advanceProducerQueues(state: GameState, monasteryOnly: boolean): void {
  const buildings = state.world.store(Building)
  const owners = state.world.store(Owner)
  const productions = state.world.store(Production)
  for (const producerId of state.world.query(Building, Owner, Production)) {
    const building = buildings.get(producerId)
    const owner = owners.get(producerId)?.owner
    const production = productions.get(producerId)
    const canResearch =
      building === undefined ? false : BUILDING_DEFINITIONS[building.buildingType].capabilities.canResearch
    if (
      building === undefined ||
      !BUILDING_DEFINITIONS[building.buildingType].capabilities.canProduce ||
      building.status !== 'COMPLETED' ||
      (building.tierUpgrade !== undefined && building.tierUpgrade !== null) ||
      canResearch !== monasteryOnly ||
      owner === undefined ||
      production === undefined
    ) {
      continue
    }
    advanceQueue(state, producerId, owner, production.queue)
  }
}

/** Advances the shared Monastery queue before combat. */
export function monasteryQueueSystem(state: GameState): void {
  advanceProducerQueues(state, true)
}

/** Advances one deterministic item for non-Monastery producers after supply. */
export function productionSystem(state: GameState): void {
  advanceProducerQueues(state, false)
}
