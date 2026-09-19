import type { SnapshotMessage } from '@rts/protocol'
import type { RenderFrame } from '@rts/renderer'

/** Maps a protocol snapshot to a renderable frame. */
export function snapshotToFrame(message: SnapshotMessage): RenderFrame {
  return {
    tick: message.tick,
    units: message.units.map((unit) => ({
      id: unit.id,
      x: unit.x,
      y: unit.y,
      owner: unit.owner,
      kind: unit.kind ?? 'pawn',
      ...(unit.orderState === undefined ? {} : { orderState: unit.orderState }),
      ...(unit.economy === undefined ? {} : { economy: unit.economy }),
      ...(unit.hp === undefined ? {} : { hp: unit.hp, maxHp: unit.maxHp })
    })),
    bases: message.bases.map((base) => ({ id: base.id, x: base.x, y: base.y, owner: base.owner })),
    ...(message.constructions === undefined
      ? {}
      : {
          constructions: message.constructions.map((construction) => ({
            id: construction.id,
            buildingType: construction.buildingType,
            x: construction.x,
            y: construction.y,
            owner: construction.owner,
            footprint: construction.footprint,
            status: construction.status,
            progressTicks: construction.progressTicks,
            totalTicks: construction.totalTicks
          }))
        }),
    mineralNodes: message.mineralNodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      remaining: node.remaining
    })),
    players: message.players.map((player) => ({ id: player.id, defeated: player.defeated, gold: player.gold })),
    events: message.events
  }
}
