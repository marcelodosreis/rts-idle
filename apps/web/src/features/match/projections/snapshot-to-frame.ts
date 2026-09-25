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
      ...(construction.builderId === undefined ? {} : { builderId: construction.builderId }),
      footprint: construction.footprint,
      status: construction.status,
      progressTicks: construction.progressTicks,
      totalTicks: construction.totalTicks
    })),
    mineralNodes: message.mineralNodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      remaining: node.remaining
    })),
    events: message.events
  }
}
