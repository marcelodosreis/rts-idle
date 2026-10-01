import {
  type BuildingType,
  type ResourceCost,
  TRAINABLE_UNIT_KINDS,
  type TrainableUnitKind,
  type UnitKind
} from '@rts/shared'

export type { TrainableUnitKind }
export { TRAINABLE_UNIT_KINDS }

export interface UnitProductionDefinition {
  readonly unitKind: TrainableUnitKind
  readonly producer: Extract<BuildingType, 'CASTLE' | 'BARRACKS' | 'ARCHERY' | 'MONASTERY'>
  readonly cost: ResourceCost
  readonly trainingTicks: number
  readonly supply: number
}

/** Centralized initial balance; production tuning changes this table only. */
export const UNIT_PRODUCTION_DEFINITIONS: Readonly<Record<TrainableUnitKind, UnitProductionDefinition>> = Object.freeze(
  {
    pawn: Object.freeze({
      unitKind: 'pawn',
      producer: 'CASTLE',
      cost: { GOLD: 50 },
      trainingTicks: 100,
      supply: 1
    }),
    warrior: Object.freeze({
      unitKind: 'warrior',
      producer: 'BARRACKS',
      cost: { GOLD: 100 },
      trainingTicks: 200,
      supply: 1
    }),
    archer: Object.freeze({
      unitKind: 'archer',
      producer: 'BARRACKS',
      cost: { GOLD: 125 },
      trainingTicks: 300,
      supply: 1
    }),
    lancer: Object.freeze({
      unitKind: 'lancer',
      producer: 'BARRACKS',
      cost: { GOLD: 100 },
      trainingTicks: 200,
      supply: 1
    }),
    monk: Object.freeze({
      unitKind: 'monk',
      producer: 'MONASTERY',
      cost: { GOLD: 125 },
      trainingTicks: 300,
      supply: 1
    })
  }
)

export function isProductionBuilding(value: BuildingType): value is UnitProductionDefinition['producer'] {
  return value === 'CASTLE' || value === 'BARRACKS' || value === 'ARCHERY' || value === 'MONASTERY'
}

export function isTrainableUnitKind(value: UnitKind): value is TrainableUnitKind {
  return TRAINABLE_UNIT_KINDS.includes(value as TrainableUnitKind)
}
