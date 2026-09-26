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
  BASE: Object.freeze({
    footprint: Object.freeze({ width: 5, height: 4 }),
    visualSize: Object.freeze({ width: renderPixelsToFixed(320), height: renderPixelsToFixed(256) }),
    artSize: Object.freeze({ width: renderPixelsToFixed(312), height: renderPixelsToFixed(208) })
  }),
  BARRACKS: Object.freeze({
    footprint: Object.freeze({ width: 3, height: 4 }),
    visualSize: Object.freeze({ width: renderPixelsToFixed(192), height: renderPixelsToFixed(256) }),
    artSize: Object.freeze({ width: renderPixelsToFixed(184), height: renderPixelsToFixed(187) })
  }),
  SUPPLY_DEPOT: Object.freeze({
    footprint: Object.freeze({ width: 2, height: 3 }),
    visualSize: Object.freeze({ width: renderPixelsToFixed(128), height: renderPixelsToFixed(192) }),
    artSize: Object.freeze({ width: renderPixelsToFixed(112), height: renderPixelsToFixed(157) })
  })
} satisfies Record<BuildingType, BuildingGeometry>)

export const BUILDING_FOOTPRINTS = Object.freeze({
  BASE: BUILDING_GEOMETRY.BASE.footprint,
  BARRACKS: BUILDING_GEOMETRY.BARRACKS.footprint,
  SUPPLY_DEPOT: BUILDING_GEOMETRY.SUPPLY_DEPOT.footprint
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
  })
} satisfies Record<UnitKind, UnitGeometry>)
