import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { MAX_SUPPLY_CAPACITY, SUPPLY_PER_UNIT } from '../data/supply-rules.js'
import { Building } from '../ecs/building-component.js'
import { Kind, Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

/** Recomputes authoritative supply from the live world at a deterministic tick boundary. */
export function updateSupply(state: GameState): void {
  const owners = state.world.store(Owner)
  const kinds = state.world.store(Kind)
  const buildings = state.world.store(Building)
  const used = new Map<number, number>()
  const capacity = new Map<number, number>()

  for (const player of state.players) {
    used.set(player.id, 0)
    capacity.set(player.id, 0)
  }
  for (const id of state.world.query(Owner)) {
    const owner = owners.get(id)?.owner
    if (owner === undefined) {
      continue
    }
    if (kinds.has(id)) {
      used.set(owner, (used.get(owner) ?? 0) + SUPPLY_PER_UNIT)
      continue
    }
    const building = buildings.get(id)
    if (building?.status !== 'COMPLETED') {
      continue
    }
    const amount = BUILDING_DEFINITIONS[building.buildingType].supplyProvided
    capacity.set(owner, Math.min(MAX_SUPPLY_CAPACITY, (capacity.get(owner) ?? 0) + amount))
  }
  for (const player of state.players) {
    player.usedSupply = Math.max(0, used.get(player.id) ?? 0)
    player.supplyCap = Math.max(0, Math.min(MAX_SUPPLY_CAPACITY, capacity.get(player.id) ?? 0))
  }
}
