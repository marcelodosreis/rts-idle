import type { EconomyPhase, SnapshotEconomy } from '@rts/protocol'
import type { Order, ResourceCatalog } from '@rts/simulation'

export function projectEconomy(
  front: Order | undefined,
  cargo: { readonly amount: number; readonly capacity: number } | undefined,
  resources: ResourceCatalog
): SnapshotEconomy | undefined {
  if (front?.type !== 'GATHER' || cargo === undefined) {
    return undefined
  }
  const phaseByOrder: Readonly<Record<typeof front.phase, EconomyPhase>> = {
    TO_RESOURCE: 'to_resource',
    HARVESTING: 'harvesting',
    TO_BASE: 'to_base',
    WAITING_FOR_BASE: 'waiting_for_base'
  }
  return {
    phase: phaseByOrder[front.phase],
    cargoAmount: cargo.amount,
    cargoCapacity: cargo.capacity,
    progressTicks: front.progressTicks,
    progressMax: resources.entry(front.resourceId)?.harvestTicks ?? 1,
    resourceId: front.resourceId
  }
}
