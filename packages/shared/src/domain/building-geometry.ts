import { type Fixed, renderPixelsToFixed } from '../primitives/fixed.js'
import type { BuildingType } from './commands.js'
import type { UnitKind } from './unit-kind.js'

export interface BuildingFootprintSize {
  readonly width: number
  readonly height: number
}

export interface BuildingVisualSize {
  readonly width: Fixed
  readonly height: Fixed
}

export interface BuildingGeometry {
  readonly footprint: BuildingFootprintSize
  readonly visualSize: BuildingVisualSize
  readonly artSize: BuildingVisualSize
}

export interface UnitGeometry {
  readonly cellSize: Fixed
  readonly sourceVisibleHeight: Fixed
  readonly targetVisibleHeight: Fixed
  readonly fallbackDiameter: Fixed
  readonly clickRadius: Fixed
  readonly targetRadius: Fixed
}

/** Single source of truth for logical placement and visible building bounds. */
export const BUILDING_GEOMETRY = Object.freeze({
  CASTLE: Object.freeze({
    footprint: Object.freeze({ width: 5, height: 4 }),
    visualSize: Object.freeze({ width: renderPixelsToFixed(320), height: renderPixelsToFixed(256) }),
    artSize: Object.freeze({ width: renderPixelsToFixed(312), height: renderPixelsToFixed(208) })
  }),
  BARRACKS: Object.freeze({
    footprint: Object.freeze({ width: 3, height: 4 }),
    visualSize: Object.freeze({ width: renderPixelsToFixed(192), height: renderPixelsToFixed(256) }),
    artSize: Object.freeze({ width: renderPixelsToFixed(184), height: renderPixelsToFixed(187) })
  }),
  ARCHERY: Object.freeze({
    footprint: Object.freeze({ width: 3, height: 4 }),
    visualSize: Object.freeze({ width: renderPixelsToFixed(192), height: renderPixelsToFixed(256) }),
    artSize: Object.freeze({ width: renderPixelsToFixed(192), height: renderPixelsToFixed(256) })
  }),
  MONASTERY: Object.freeze({
    footprint: Object.freeze({ width: 3, height: 5 }),
    visualSize: Object.freeze({ width: renderPixelsToFixed(192), height: renderPixelsToFixed(320) }),
    artSize: Object.freeze({ width: renderPixelsToFixed(192), height: renderPixelsToFixed(320) })
  }),
  HOUSE: Object.freeze({
    footprint: Object.freeze({ width: 2, height: 3 }),
    visualSize: Object.freeze({ width: renderPixelsToFixed(128), height: renderPixelsToFixed(192) }),
    artSize: Object.freeze({ width: renderPixelsToFixed(128), height: renderPixelsToFixed(192) })
  }),
  TOWER: Object.freeze({
    footprint: Object.freeze({ width: 2, height: 4 }),
    visualSize: Object.freeze({ width: renderPixelsToFixed(128), height: renderPixelsToFixed(256) }),
    artSize: Object.freeze({ width: renderPixelsToFixed(128), height: renderPixelsToFixed(256) })
  })
} satisfies Record<BuildingType, BuildingGeometry>)

export const BUILDING_FOOTPRINTS = Object.freeze({
  CASTLE: BUILDING_GEOMETRY.CASTLE.footprint,
  BARRACKS: BUILDING_GEOMETRY.BARRACKS.footprint,
  ARCHERY: BUILDING_GEOMETRY.ARCHERY.footprint,
  MONASTERY: BUILDING_GEOMETRY.MONASTERY.footprint,
  HOUSE: BUILDING_GEOMETRY.HOUSE.footprint,
  TOWER: BUILDING_GEOMETRY.TOWER.footprint
} satisfies Record<BuildingType, BuildingFootprintSize>)

/** Single source of truth for normalized unit art, fallback, and hit areas. */
export const UNIT_GEOMETRY = Object.freeze({
  pawn: Object.freeze({
    cellSize: renderPixelsToFixed(64),
    sourceVisibleHeight: renderPixelsToFixed(72),
    targetVisibleHeight: renderPixelsToFixed(48),
    fallbackDiameter: renderPixelsToFixed(48),
    clickRadius: renderPixelsToFixed(24),
    targetRadius: renderPixelsToFixed(32)
  }),
  warrior: Object.freeze({
    cellSize: renderPixelsToFixed(64),
    sourceVisibleHeight: renderPixelsToFixed(88),
    targetVisibleHeight: renderPixelsToFixed(48),
    fallbackDiameter: renderPixelsToFixed(48),
    clickRadius: renderPixelsToFixed(24),
    targetRadius: renderPixelsToFixed(32)
  }),
  archer: Object.freeze({
    cellSize: renderPixelsToFixed(64),
    sourceVisibleHeight: renderPixelsToFixed(88),
    targetVisibleHeight: renderPixelsToFixed(48),
    fallbackDiameter: renderPixelsToFixed(48),
    clickRadius: renderPixelsToFixed(24),
    targetRadius: renderPixelsToFixed(32)
  }),
  lancer: Object.freeze({
    cellSize: renderPixelsToFixed(64),
    sourceVisibleHeight: renderPixelsToFixed(88),
    targetVisibleHeight: renderPixelsToFixed(48),
    fallbackDiameter: renderPixelsToFixed(48),
    clickRadius: renderPixelsToFixed(24),
    targetRadius: renderPixelsToFixed(32)
  }),
  monk: Object.freeze({
    cellSize: renderPixelsToFixed(64),
    sourceVisibleHeight: renderPixelsToFixed(88),
    targetVisibleHeight: renderPixelsToFixed(48),
    fallbackDiameter: renderPixelsToFixed(48),
    clickRadius: renderPixelsToFixed(24),
    targetRadius: renderPixelsToFixed(32)
  })
} satisfies Record<UnitKind, UnitGeometry>)
