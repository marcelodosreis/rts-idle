import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { isBuildableTile, type MapDefinition, placementBoundsFromMap, tileAtPosition } from '@rts/shared'
import type { DemoScenario } from '../content/demo/scenarios.js'

const FIXED_POINT_SCALE = 256

export function assertScenarioFitsMap(scenario: DemoScenario, map: MapDefinition): void {
  const bounds = placementBoundsFromMap(map)
  for (const spawn of scenario.spawns) {
    assertBuildableTile(map, spawn.x, spawn.y, 'scenario spawn')
  }
  for (const node of scenario.mineralNodes ?? []) {
    assertBuildableTile(map, node.x, node.y, 'mineral node')
  }
  for (const base of scenario.buildings ?? []) {
    assertBaseFitsMap(map, bounds, base.x, base.y)
  }
}

function assertBuildableTile(map: MapDefinition, x: number, y: number, label: string): void {
  const tile = tileAtPosition(map, Math.floor(x / FIXED_POINT_SCALE), Math.floor(y / FIXED_POINT_SCALE))
  if (tile === null || !isBuildableTile(tile)) {
    throw new Error(`${label} is outside or on invalid terrain`)
  }
}

function assertBaseFitsMap(
  map: MapDefinition,
  bounds: { readonly width: number; readonly height: number },
  fixedX: number,
  fixedY: number
): void {
  const x = fixedX / FIXED_POINT_SCALE
  const y = fixedY / FIXED_POINT_SCALE
  const footprint = BUILDING_DEFINITIONS.BASE.footprint
  for (let row = y; row < y + footprint.height; row += 1) {
    for (let col = x; col < x + footprint.width; col += 1) {
      if (
        col < 0 ||
        row < 0 ||
        col >= bounds.width ||
        row >= bounds.height ||
        !isBuildableTile(tileAtPosition(map, col, row)!)
      ) {
        throw new Error('scenario base is outside or on invalid terrain')
      }
    }
  }
}
