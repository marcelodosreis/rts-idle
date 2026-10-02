import type { ResourceCost } from '@rts/shared'

export interface RepairDefinition {
  readonly ticksPerStep: number
  readonly healthPerStep: number
  readonly cost: ResourceCost
}

/** Shared mechanical repair tuning; callers still apply the complete cost map. */
export const MECHANICAL_REPAIR: RepairDefinition = Object.freeze({
  ticksPerStep: 10,
  healthPerStep: 5,
  cost: Object.freeze({ GOLD: 1 })
})
