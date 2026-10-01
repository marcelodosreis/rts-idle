import type { SnapshotMessage } from '@rts/protocol'
import type { RenderFrame } from '@rts/renderer'
import { projectSnapshotUnit } from './snapshot-unit'

/** Maps a protocol snapshot to a renderable frame. */
export function snapshotToFrame(message: SnapshotMessage): RenderFrame {
  return {
    tick: message.tick,
    units: message.units.map((unit) => ({ id: unit.id, x: unit.x, y: unit.y, ...projectSnapshotUnit(unit) })),
    buildings: message.buildings.map((construction) => ({
      id: construction.id,
      buildingType: construction.buildingType,
      x: construction.x,
      y: construction.y,
      owner: construction.owner,
      ...(construction.tier === undefined ? {} : { tier: construction.tier }),
      ...(construction.tierUpgrade === undefined ? {} : { tierUpgrade: construction.tierUpgrade }),
      ...(construction.builderId === undefined ? {} : { builderId: construction.builderId }),
      footprint: construction.footprint,
      status: construction.status,
      progressTicks: construction.progressTicks,
      totalTicks: construction.totalTicks,
      ...(construction.hp === undefined ? {} : { hp: construction.hp, maxHp: construction.maxHp }),
      ...(construction.production === undefined ? {} : { production: construction.production })
    })),
    resources: message.resources.map((resource) => ({
      resourceId: resource.resourceId,
      remaining: resource.remaining
    })),
    events: message.events
  }
}
