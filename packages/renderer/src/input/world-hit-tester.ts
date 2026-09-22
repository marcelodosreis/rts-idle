import type { WorldPoint, WorldTarget } from './input-types.js'

export interface WorldHitTester {
  targetAt(position: WorldPoint): WorldTarget
}

export interface WorldHitTesterSources {
  readonly unitAt: (x: number, y: number) => number | null
  readonly buildingAt: (x: number, y: number) => number | null
  readonly mineralNodeAt: (x: number, y: number) => number | null
}

/** Keeps target precedence in one place for both primary and secondary input. */
export function createWorldHitTester(sources: WorldHitTesterSources): WorldHitTester {
  return {
    targetAt(position) {
      const mineral = sources.mineralNodeAt(position.x, position.y)
      if (mineral !== null) {
        return { kind: 'mineral', id: mineral }
      }
      const unit = sources.unitAt(position.x, position.y)
      if (unit !== null) {
        return { kind: 'unit', id: unit }
      }
      const building = sources.buildingAt(position.x, position.y)
      if (building !== null) {
        return { kind: 'building', id: building }
      }
      return { kind: 'ground', position: { x: position.x, y: position.y } }
    }
  }
}
