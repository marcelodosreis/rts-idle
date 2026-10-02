import { type PlayerResources, RESOURCE_TYPES, type ResourceCost, type ResourceType } from '@rts/shared'

export interface ResourceCostEntry {
  readonly type: ResourceType
  readonly amount: number
}

export interface ResourceShortfall extends ResourceCostEntry {
  readonly available: number
}

export function resourceCostEntries(cost: ResourceCost): readonly ResourceCostEntry[] {
  return RESOURCE_TYPES.flatMap((type) => {
    const amount = cost[type]
    return amount === undefined || amount <= 0 ? [] : [{ type, amount }]
  })
}

export function resourceCostLabel(cost: ResourceCost): string {
  const entries = resourceCostEntries(cost)
  return entries.length === 0
    ? 'No resource cost'
    : entries.map(({ type, amount }) => `${amount} ${resourceTypeLabel(type)}`).join(' · ')
}

export function resourceCostKey(cost: ResourceCost): string {
  return RESOURCE_TYPES.map((type) => `${type}:${cost[type] ?? 0}`).join('|')
}

export function firstResourceShortfall(resources: PlayerResources, cost: ResourceCost): ResourceShortfall | undefined {
  for (const { type, amount } of resourceCostEntries(cost)) {
    if (resources[type] < amount) {
      return { type, amount, available: resources[type] }
    }
  }
  return undefined
}

export function resourceTypeLabel(type: ResourceType): string {
  return type.toLowerCase()
}
