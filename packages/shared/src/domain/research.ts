export const RESEARCH_TYPES = ['ATTACK', 'DEFENSE', 'ECONOMY', 'MOVEMENT'] as const

export type ResearchType = (typeof RESEARCH_TYPES)[number]

export const RESEARCH_ITEM_STATUSES = ['ACTIVE', 'QUEUED'] as const

export type ResearchItemStatus = (typeof RESEARCH_ITEM_STATUSES)[number]
