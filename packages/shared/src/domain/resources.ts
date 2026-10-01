/** Closed economic resource registry shared by simulation, protocol, and UI. */
export const RESOURCE_TYPES = ['GOLD', 'WOOD'] as const

export type ResourceType = (typeof RESOURCE_TYPES)[number]

/** Closed registry for map-authored resource sources. */
export const RESOURCE_KINDS = ['TREE', 'GOLD_MINE'] as const

export type ResourceKind = (typeof RESOURCE_KINDS)[number]

/** Stable map-local identifier, deliberately unrelated to ECS EntityId. */
export type ResourceId = number

/** Canonical kind → yielded resource-type mapping. */
const RESOURCE_OUTPUTS: Readonly<{ [K in ResourceKind]: ResourceType }> = {
  TREE: 'WOOD',
  GOLD_MINE: 'GOLD'
}

export function resourceTypeForKind(kind: ResourceKind): ResourceType {
  return RESOURCE_OUTPUTS[kind]
}

export type PlayerResources = { [K in ResourceType]: number }
export type ResourceCost = Readonly<Partial<PlayerResources>>

export function createPlayerResources(initial?: Partial<PlayerResources>): PlayerResources {
  return { GOLD: initial?.GOLD ?? 0, WOOD: initial?.WOOD ?? 0 }
}

export function addPlayerResource(resources: PlayerResources, type: ResourceType, amount: number): void {
  resources[type] += amount
}

export function spendPlayerResource(resources: PlayerResources, type: ResourceType, amount: number): boolean {
  if (resources[type] < amount) {
    return false
  }
  resources[type] -= amount
  return true
}

export function canAfford(resources: PlayerResources, cost: ResourceCost): boolean {
  return RESOURCE_TYPES.every((type) => resources[type] >= (cost[type] ?? 0))
}

export function applyResourceCost(resources: PlayerResources, cost: ResourceCost, direction: 1 | -1): void {
  for (const type of RESOURCE_TYPES) {
    resources[type] += direction * (cost[type] ?? 0)
  }
}

/**
 * Deterministic partial refund shared by construction and production
 * cancellation: `floor(cost * remaining * 3 / (totalTicks * 4))` per defined
 * resource type. Callers must pass a positive `totalTicks`.
 */
export function partialResourceRefund(cost: ResourceCost, remaining: number, totalTicks: number): ResourceCost {
  const refund: { GOLD?: number; WOOD?: number } = {}
  for (const type of RESOURCE_TYPES) {
    const amount = cost[type]
    if (amount !== undefined) {
      refund[type] = Math.floor((amount * remaining * 3) / (totalTicks * 4))
    }
  }
  return refund
}
