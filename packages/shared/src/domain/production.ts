import { partialResourceRefund, type ResourceCost } from './resources.js'

export const PRODUCTION_ITEM_STATUSES = ['ACTIVE', 'QUEUED', 'COMPLETED_WAITING'] as const

export const MAX_PRODUCTION_QUEUE = 5

export type ProductionItemStatus = (typeof PRODUCTION_ITEM_STATUSES)[number]

/** Refunds a production item according to its authoritative queue state. */
export function productionRefund(
  status: ProductionItemStatus,
  cost: ResourceCost,
  progressTicks: number,
  totalTicks: number
): ResourceCost {
  if (status === 'QUEUED') {
    return cost
  }
  if (status === 'COMPLETED_WAITING') {
    return {}
  }
  return partialResourceRefund(cost, Math.max(0, totalTicks - progressTicks), totalTicks)
}
