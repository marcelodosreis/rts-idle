import type { BuildingType, UnitKind } from '@rts/shared'

/**
 * Single canonical codec for domain tag numbers (strong-typing / DRY policy).
 * Numeric tags are part of the serialized schema; reordering them changes the
 * golden hash. Shared by every canonical component that encodes a kind/type so
 * the mapping is defined once.
 */

const BUILDING_TYPE_TAGS: Readonly<Record<BuildingType, number>> = {
  BASE: 0,
  BARRACKS: 1,
  SUPPLY_DEPOT: 2
}

const BUILDING_TYPE_BY_TAG: Readonly<Record<number, BuildingType>> = {
  0: 'BASE',
  1: 'BARRACKS',
  2: 'SUPPLY_DEPOT'
}

export function buildingTypeTag(buildingType: BuildingType): number {
  return BUILDING_TYPE_TAGS[buildingType]
}

export function buildingTypeFromTag(tag: number): BuildingType {
  const buildingType = BUILDING_TYPE_BY_TAG[tag]
  if (buildingType === undefined) {
    throw new Error(`Building: invalid building type tag ${tag}`)
  }
  return buildingType
}

const KIND_TAGS: Readonly<Record<UnitKind, number>> = {
  pawn: 0,
  warrior: 1,
  archer: 2
}

const KIND_BY_TAG: Readonly<Record<number, UnitKind>> = {
  0: 'pawn',
  1: 'warrior',
  2: 'archer'
}

export function kindTag(kind: UnitKind): number {
  return KIND_TAGS[kind]
}

export function kindFromTag(tag: number): UnitKind {
  const kind = KIND_BY_TAG[tag]
  if (kind === undefined) {
    throw new Error(`Kind: invalid kind tag ${tag}`)
  }
  return kind
}
