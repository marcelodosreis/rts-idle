import { FIXED_SCALE, type ResourceCost } from '@rts/shared'

export const MONK_HEAL_AMOUNT = 25
export const MONK_HEAL_RANGE_FIXED = 3 * FIXED_SCALE
export const MONK_HEAL_COOLDOWN_TICKS = 160

export const EXPLOSIVE_SHOT_COST: ResourceCost = { GOLD: 25, WOOD: 0 }
export const EXPLOSIVE_SHOT_COOLDOWN_TICKS = 160
export const EXPLOSIVE_SHOT_RANGE_FIXED = 3 * FIXED_SCALE
export const EXPLOSIVE_SHOT_INNER_RADIUS_FIXED = FIXED_SCALE / 2
export const EXPLOSIVE_SHOT_TOTAL_RADIUS_FIXED = (FIXED_SCALE * 3) / 2
/** The blast hits harder than a normal arrow; captured at launch. */
export const EXPLOSIVE_SHOT_DAMAGE_MULTIPLIER = 2
