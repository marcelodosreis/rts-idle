import type { BuildingType } from '@rts/shared'
import { BUILDING_FOOTPRINTS } from './building-footprints.js'

export interface BuildingDefinition {
  readonly type: BuildingType
  readonly label: string
  readonly footprint: { readonly width: number; readonly height: number }
  readonly costMinerals: number
  readonly constructionTicks: number
  readonly supplyProvided: number
  readonly maxHp: number
  readonly mechanical: boolean
}

/** Baseline building content values; balance is intentionally deferred. */
export const BASE_BUILDING: BuildingDefinition = Object.freeze({
  type: 'BASE',
  label: 'Base',
  footprint: BUILDING_FOOTPRINTS.BASE,
  costMinerals: 100,
  constructionTicks: 100,
  supplyProvided: 10,
  maxHp: 500,
  mechanical: true
})

export const BARRACKS_BUILDING: BuildingDefinition = Object.freeze({
  type: 'BARRACKS',
  label: 'Barracks',
  footprint: BUILDING_FOOTPRINTS.BARRACKS,
  costMinerals: 150,
  constructionTicks: 100,
  supplyProvided: 0,
  maxHp: 400,
  mechanical: true
})

export const SUPPLY_DEPOT_BUILDING: BuildingDefinition = Object.freeze({
  type: 'SUPPLY_DEPOT',
  label: 'Supply Depot',
  footprint: BUILDING_FOOTPRINTS.SUPPLY_DEPOT,
  costMinerals: 100,
  constructionTicks: 100,
  supplyProvided: 8,
  maxHp: 250,
  mechanical: true
})

export const BUILDING_DEFINITIONS = Object.freeze({
  BASE: BASE_BUILDING,
  BARRACKS: BARRACKS_BUILDING,
  SUPPLY_DEPOT: SUPPLY_DEPOT_BUILDING
} satisfies Record<BuildingType, BuildingDefinition>)
