import { createPlayerResources, type PlayerResources, RESOURCE_TYPES, type ResourceCost } from '@rts/shared'
import type { CanonicalReader } from './reader.js'
import type { CanonicalWriter } from './writer.js'

export function writePlayerResources(writer: CanonicalWriter, resources: PlayerResources): void {
  for (const type of RESOURCE_TYPES) {
    writer.writeI32(resources[type])
  }
}

export function readPlayerResources(reader: CanonicalReader): PlayerResources {
  const resources = createPlayerResources()
  for (const type of RESOURCE_TYPES) {
    resources[type] = reader.readI32()
  }
  return resources
}

export function writeResourceCost(writer: CanonicalWriter, cost: ResourceCost): void {
  for (const type of RESOURCE_TYPES) {
    writer.writeI32(cost[type] ?? 0)
  }
}

export function readResourceCost(reader: CanonicalReader): ResourceCost {
  const cost: Partial<PlayerResources> = {}
  for (const type of RESOURCE_TYPES) {
    const amount = reader.readI32()
    if (amount !== 0) {
      cost[type] = amount
    }
  }
  return cost
}
