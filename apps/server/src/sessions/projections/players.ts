import type { SnapshotPlayer } from '@rts/protocol'
import type { ResearchType } from '@rts/shared'
import { Building, isResearchProductionItem, Owner, type PlayerState, Production, type World } from '@rts/simulation'

function queuedResearchFor(world: World, ownerId: number): readonly ResearchType[] {
  const buildings = world.store(Building)
  const owners = world.store(Owner)
  const productions = world.store(Production)
  const topics = new Set<ResearchType>()
  for (const id of world.aliveIds()) {
    if (buildings.get(id)?.buildingType !== 'MONASTERY' || owners.get(id)?.owner !== ownerId) {
      continue
    }
    for (const item of productions.get(id)?.queue ?? []) {
      if (isResearchProductionItem(item)) {
        topics.add(item.researchType)
      }
    }
  }
  return [...topics]
}

export function projectPlayers(players: readonly PlayerState[], world: World): readonly SnapshotPlayer[] {
  return players.map((player) => {
    const queuedResearch = queuedResearchFor(world, player.id)
    return {
      id: player.id,
      defeated: player.defeated,
      gold: player.gold,
      usedSupply: player.usedSupply,
      reservedSupply: player.reservedSupply,
      supplyCap: player.supplyCap,
      highestCastleTierReached: player.highestCastleTierReached,
      completedResearch: [...player.completedResearch],
      ...(queuedResearch.length === 0 ? {} : { queuedResearch })
    }
  })
}
