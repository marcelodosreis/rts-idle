import type { BuildingType, ResourceCost } from '@rts/shared'
import { BUILDING_FOOTPRINTS } from './building-footprints.js'

export interface BuildingDefinition {
  readonly type: BuildingType
  readonly label: string
  readonly footprint: { readonly width: number; readonly height: number }
  readonly cost: ResourceCost
  readonly constructionTicks: number
  readonly supplyProvided: number
  readonly maxHp: number
  readonly mechanical: boolean
}

/** Baseline building content values; balance is intentionally deferred. */
export const CASTLE_BUILDING: BuildingDefinition = Object.freeze({
  type: 'CASTLE',
  label: 'Castle',
  footprint: BUILDING_FOOTPRINTS.CASTLE,
  cost: { GOLD: 100 },
  constructionTicks: 100,
  supplyProvided: 10,
  maxHp: 500,
  mechanical: true
})

export const BARRACKS_BUILDING: BuildingDefinition = Object.freeze({
  type: 'BARRACKS',
  label: 'Barracks',
  footprint: BUILDING_FOOTPRINTS.BARRACKS,
  cost: { GOLD: 150 },
  constructionTicks: 100,
  supplyProvided: 0,
  maxHp: 400,
  mechanical: true
})

export const ARCHERY_BUILDING: BuildingDefinition = Object.freeze({
  type: 'ARCHERY',
  label: 'Archery',
  footprint: BUILDING_FOOTPRINTS.ARCHERY,
  cost: { GOLD: 150 },
  constructionTicks: 100,
  supplyProvided: 0,
  maxHp: 400,
  mechanical: true
})

export const MONASTERY_BUILDING: BuildingDefinition = Object.freeze({
  type: 'MONASTERY',
  label: 'Monastery',
  footprint: BUILDING_FOOTPRINTS.MONASTERY,
  cost: BARRACKS_BUILDING.cost,
  constructionTicks: BARRACKS_BUILDING.constructionTicks,
  supplyProvided: 0,
  maxHp: 400,
  mechanical: true
})

export const HOUSE_BUILDING: BuildingDefinition = Object.freeze({
  type: 'HOUSE',
  label: 'House',
  footprint: BUILDING_FOOTPRINTS.HOUSE,
  cost: { GOLD: 100 },
  constructionTicks: 100,
  supplyProvided: 8,
  maxHp: 250,
  mechanical: true
})

export const TOWER_BUILDING: BuildingDefinition = Object.freeze({
  type: 'TOWER',
  label: 'Tower',
  footprint: BUILDING_FOOTPRINTS.TOWER,
  cost: { GOLD: 125 },
  constructionTicks: 100,
  supplyProvided: 0,
  maxHp: 300,
  mechanical: true
})

export const BUILDING_DEFINITIONS = Object.freeze({
  CASTLE: CASTLE_BUILDING,
  BARRACKS: BARRACKS_BUILDING,
  ARCHERY: ARCHERY_BUILDING,
  MONASTERY: MONASTERY_BUILDING,
  HOUSE: HOUSE_BUILDING,
  TOWER: TOWER_BUILDING
} satisfies Record<BuildingType, BuildingDefinition>)
