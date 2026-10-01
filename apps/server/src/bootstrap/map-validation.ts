import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { isBuildableTile, type MapDefinition, placementBoundsFromMap, tileAtPosition, tileKey } from '@rts/shared'
import type { DemoScenario } from '../content/demo/scenarios.js'

const FIXED_POINT_SCALE = 256

export function assertScenarioFitsMap(scenario: DemoScenario, map: MapDefinition): void {
  const bounds = placementBoundsFromMap(map)
  assertResourcesFitScenario(scenario, map)
  for (const spawn of scenario.spawns) {
    assertBuildableTile(map, spawn.x, spawn.y, 'scenario spawn')
  }
  for (const base of scenario.buildings ?? []) {
    assertBaseFitsMap(map, bounds, base.x, base.y)
  }
}

function occupiedScenarioTiles(scenario: DemoScenario): ReadonlySet<string> {
  const occupied = new Set<string>()
  for (const spawn of scenario.spawns) {
    occupied.add(tileKey(Math.floor(spawn.x / FIXED_POINT_SCALE), Math.floor(spawn.y / FIXED_POINT_SCALE)))
  }
  for (const building of scenario.buildings ?? []) {
    const definition = BUILDING_DEFINITIONS[building.buildingType ?? 'CASTLE']
    const baseX = building.x / FIXED_POINT_SCALE
    const baseY = building.y / FIXED_POINT_SCALE
    for (let y = baseY; y < baseY + definition.footprint.height; y += 1) {
      for (let x = baseX; x < baseX + definition.footprint.width; x += 1) {
        occupied.add(tileKey(x, y))
      }
    }
  }
  return occupied
}

function assertResourcesFitScenario(scenario: DemoScenario, map: MapDefinition): void {
  const occupied = occupiedScenarioTiles(scenario)
  for (const resource of map.resources) {
    const tile = tileKey(Math.floor(resource.x / FIXED_POINT_SCALE), Math.floor(resource.y / FIXED_POINT_SCALE))
    if (occupied.has(tile)) {
      throw new Error(`resource ${resource.resourceId} overlaps scenario content at ${tile}`)
    }
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
  const footprint = BUILDING_DEFINITIONS.CASTLE.footprint
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
