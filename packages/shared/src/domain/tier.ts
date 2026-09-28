export const CASTLE_TIERS = [1, 2, 3] as const

export type CastleTier = (typeof CASTLE_TIERS)[number]
