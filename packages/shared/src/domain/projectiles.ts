/** Closed set of projectile visuals and authoritative projectile kinds. */
export const PROJECTILE_KINDS = ['arrow'] as const

export type ProjectileKind = (typeof PROJECTILE_KINDS)[number]

/** Reasons an active projectile can leave the authoritative state. */
export const PROJECTILE_EXPIRATION_REASONS = ['TTL', 'TARGET_DEAD'] as const

export type ProjectileExpirationReason = (typeof PROJECTILE_EXPIRATION_REASONS)[number]
