export const PRODUCTION_ITEM_STATUSES = ['ACTIVE', 'QUEUED', 'COMPLETED_WAITING'] as const

export const MAX_PRODUCTION_QUEUE = 5

export type ProductionItemStatus = (typeof PRODUCTION_ITEM_STATUSES)[number]

/** Refunds a production item according to its authoritative queue state. */
export function productionRefund(
  status: ProductionItemStatus,
  costMinerals: number,
  progressTicks: number,
  totalTicks: number
): number {
  if (status === 'QUEUED') {
    return costMinerals
  }
  if (status === 'COMPLETED_WAITING') {
    return 0
  }
  const remaining = Math.max(0, totalTicks - progressTicks)
  return Math.floor((costMinerals * remaining * 3) / (totalTicks * 4))
}
