import type { WorldPoint, WorldTarget } from './input-types.js'

export interface WorldHitTester {
  targetAt(position: WorldPoint): WorldTarget
}

export interface WorldHitTesterSources {
  readonly unitAt: (x: number, y: number) => number | null
  readonly buildingAt: (x: number, y: number) => number | null
  readonly resourceAt: (x: number, y: number) => number | null
}

/** Keeps target precedence in one place for both primary and secondary input. */
export function createWorldHitTester(sources: WorldHitTesterSources): WorldHitTester {
  return {
    targetAt(position) {
      const unit = sources.unitAt(position.x, position.y)
      if (unit !== null) {
        return { kind: 'unit', id: unit }
      }
      const resource = sources.resourceAt(position.x, position.y)
      if (resource !== null) {
        return { kind: 'resource', id: resource }
      }
      const building = sources.buildingAt(position.x, position.y)
      if (building !== null) {
        return { kind: 'building', id: building }
      }
      return { kind: 'ground', position: { x: position.x, y: position.y } }
    }
  }
}
