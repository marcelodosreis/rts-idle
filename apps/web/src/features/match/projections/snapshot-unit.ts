import type { SnapshotMessage } from '@rts/protocol'
import type { RenderUnit } from '@rts/renderer'

type SnapshotUnit = SnapshotMessage['units'][number]

/** Projects optional protocol unit fields into the renderer/HUD unit shape. */
export type ProjectedSnapshotUnit = Pick<
  RenderUnit,
  'owner' | 'orderState' | 'economy' | 'carrying' | 'hp' | 'maxHp' | 'repairProgressTicks' | 'repairProgressMax'
> & {
  readonly kind: NonNullable<RenderUnit['kind']>
}

export function projectSnapshotUnit(unit: SnapshotUnit): ProjectedSnapshotUnit {
  return {
    owner: unit.owner,
    kind: unit.kind ?? 'pawn',
    ...(unit.orderState === undefined ? {} : { orderState: unit.orderState }),
    ...(unit.economy === undefined ? {} : { economy: unit.economy }),
    ...(unit.carrying === undefined ? {} : { carrying: unit.carrying }),
    ...(unit.hp === undefined ? {} : { hp: unit.hp, maxHp: unit.maxHp }),
    ...(unit.lookAtX === undefined ? {} : { lookAtX: unit.lookAtX }),
    ...(unit.repairProgressTicks === undefined
      ? {}
      : { repairProgressTicks: unit.repairProgressTicks, repairProgressMax: unit.repairProgressMax })
  }
}
