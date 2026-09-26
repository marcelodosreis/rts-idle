export const PRODUCTION_ITEM_STATUSES = ['ACTIVE', 'QUEUED', 'COMPLETED_WAITING'] as const

export const MAX_PRODUCTION_QUEUE = 5

export type ProductionItemStatus = (typeof PRODUCTION_ITEM_STATUSES)[number]
