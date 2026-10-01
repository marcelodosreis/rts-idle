/** Deterministic Economy v0 rules; explicit constants, not final balance values. */
export const GATHER_TICKS_PER_RESOURCE = 20
export const RESOURCE_CARGO_CAPACITY = 10
export const GATHER_TICKS_PER_BATCH = GATHER_TICKS_PER_RESOURCE * RESOURCE_CARGO_CAPACITY

export const REPAIR_TICKS_PER_STEP = 10
export const REPAIR_HP_PER_STEP = 5
export const REPAIR_RESOURCE_COST = 1
