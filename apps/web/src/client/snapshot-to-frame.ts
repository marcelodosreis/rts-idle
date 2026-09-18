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
      ...(unit.hp === undefined ? {} : { hp: unit.hp, maxHp: unit.maxHp })
    })),
    players: message.players.map((player) => ({ id: player.id, defeated: player.defeated, gold: player.gold })),
    events: message.events
  }
}
