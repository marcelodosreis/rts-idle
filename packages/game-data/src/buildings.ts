import type { BuildingType } from '@rts/shared'

export interface BuildingDefinition {
  readonly type: BuildingType
  readonly footprint: { readonly width: number; readonly height: number }
  readonly costMinerals: number
  readonly constructionTicks: number
}

/** Baseline BUILD-002 content values; balance is intentionally deferred. */
export const BASE_BUILDING: BuildingDefinition = Object.freeze({
  type: 'BASE',
  footprint: Object.freeze({ width: 2, height: 2 }),
  costMinerals: 100,
  constructionTicks: 100
})

export const BASE_DEFINITION = BASE_BUILDING

export const BUILDING_DEFINITIONS: Readonly<Record<BuildingType, BuildingDefinition>> = Object.freeze({
  BASE: BASE_BUILDING
})
