import type { SnapshotMessage } from '@rts/protocol'
import type { RenderUnit } from '@rts/renderer'

type SnapshotUnit = SnapshotMessage['units'][number]

/** Projects optional protocol unit fields into the renderer/HUD unit shape. */
export type ProjectedSnapshotUnit = Pick<
  RenderUnit,
  | 'owner'
  | 'orderState'
  | 'economy'
  | 'carrying'
  | 'cargoType'
  | 'hp'
  | 'maxHp'
  | 'damage'
  | 'armor'
  | 'movementSpeedFixed'
  | 'cargoCapacity'
  | 'repairProgressTicks'
  | 'repairProgressMax'
  | 'healCooldownRemaining'
  | 'canGather'
  | 'canBuild'
  | 'canRepair'
  | 'repairable'
  | 'acceptsDeposit'
  | 'canHeal'
> & {
  readonly kind: NonNullable<RenderUnit['kind']>
  readonly canAttack?: boolean
}

export function projectSnapshotUnit(unit: SnapshotUnit): ProjectedSnapshotUnit {
  return {
    owner: unit.owner,
    kind: unit.kind,
    ...(unit.orderState === undefined ? {} : { orderState: unit.orderState }),
    ...(unit.economy === undefined ? {} : { economy: unit.economy }),
    ...(unit.carrying === undefined ? {} : { carrying: unit.carrying }),
    ...(unit.cargoType === undefined ? {} : { cargoType: unit.cargoType }),
    ...(unit.hp === undefined ? {} : { hp: unit.hp, maxHp: unit.maxHp }),
    ...(unit.damage === undefined ? {} : { damage: unit.damage }),
    ...(unit.armor === undefined ? {} : { armor: unit.armor }),
    ...(unit.movementSpeedFixed === undefined ? {} : { movementSpeedFixed: unit.movementSpeedFixed }),
    ...(unit.cargoCapacity === undefined ? {} : { cargoCapacity: unit.cargoCapacity }),
    ...(unit.lookAtX === undefined ? {} : { lookAtX: unit.lookAtX }),
    ...(unit.repairProgressTicks === undefined
      ? {}
      : { repairProgressTicks: unit.repairProgressTicks, repairProgressMax: unit.repairProgressMax }),
    ...(unit.healCooldownRemaining === undefined ? {} : { healCooldownRemaining: unit.healCooldownRemaining }),
    ...(unit.canGather === undefined ? {} : { canGather: unit.canGather }),
    ...(unit.canBuild === undefined ? {} : { canBuild: unit.canBuild }),
    ...(unit.canRepair === undefined ? {} : { canRepair: unit.canRepair }),
    ...(unit.repairable === undefined ? {} : { repairable: unit.repairable }),
    ...(unit.acceptsDeposit === undefined ? {} : { acceptsDeposit: unit.acceptsDeposit }),
    ...(unit.canHeal === undefined ? {} : { canHeal: unit.canHeal }),
    ...(unit.canAttack === undefined ? {} : { canAttack: unit.canAttack })
  }
}
