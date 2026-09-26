import { tilesToFixed } from '@rts/shared'
import { Building } from '../ecs/building-component.js'
import { Owner, Position, Production, type ProductionItem } from '../ecs/components.js'
import { createUnitEntity } from '../ecs/create-unit.js'
import type { GameState } from '../state/state.js'

function spawnPosition(state: GameState, producerId: number): { readonly x: number; readonly y: number } | null {
  const building = state.world.store(Building).get(producerId)
  if (building === undefined) {
    return null
  }
  const x = tilesToFixed(building.footprint.x + building.footprint.width)
  const y = tilesToFixed(building.footprint.y)
  if (building.footprint.x + building.footprint.width >= state.mapBounds.width) {
    return null
  }
  if (
    state.world
      .aliveIds()
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

function createUnit(state: GameState, producerId: number, item: ProductionItem): boolean {
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
    kind: item.unitKind,
    worker: item.unitKind === 'pawn'
  })
  return true
}

function releaseSupply(state: GameState, ownerId: number, item: ProductionItem): void {
  const player = state.players.find((candidate) => candidate.id === ownerId)
  if (player === undefined) {
    throw new Error(`production: owner ${ownerId} disappeared`)
  }
  player.reservedSupply -= item.reservedSupply
  player.usedSupply += item.reservedSupply
}

function advanceQueue(state: GameState, producerId: number, ownerId: number, queue: readonly ProductionItem[]): void {
  const first = queue[0]
  if (first === undefined) {
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
  const progressTicks = first.progressTicks + 1
  if (progressTicks < first.totalTicks) {
    state.world.store(Production).set(producerId, {
      queue: [{ ...first, progressTicks, status: 'ACTIVE' }, ...queue.slice(1)]
    })
    return
  }
  state.world.store(Production).set(producerId, {
    queue: [{ ...first, progressTicks: first.totalTicks, status: 'COMPLETED_WAITING' }, ...queue.slice(1)]
  })
}

/** Advances one deterministic production item per completed producer. */
export function productionSystem(state: GameState): void {
  const buildings = state.world.store(Building)
  const owners = state.world.store(Owner)
  const productions = state.world.store(Production)
  for (const producerId of state.world.aliveIds()) {
    const building = buildings.get(producerId)
    const owner = owners.get(producerId)?.owner
    const production = productions.get(producerId)
    if (
      (building?.buildingType !== 'BASE' && building?.buildingType !== 'BARRACKS') ||
      building.status !== 'COMPLETED' ||
      owner === undefined ||
      production === undefined
    ) {
      continue
    }
    advanceQueue(state, producerId, owner, production.queue)
  }
}
