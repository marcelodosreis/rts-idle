import type { SnapshotUnit } from '@rts/protocol'
import { FIXED_SCALE } from '@rts/shared'
import {
  Building,
  Cargo,
  Health,
  Kind,
  Movement,
  type Order,
  Orders,
  Owner,
  Position,
  REPAIR_TICKS_PER_STEP,
  type World
} from '@rts/simulation'
import { projectEconomy } from './economy.js'
import { deriveOrderState } from './order-state.js'

function targetCenterX(world: World, targetId: number): number | undefined {
  const position = world.store(Position).get(targetId)
  if (position === undefined) {
    return undefined
  }
  const building = world.store(Building).get(targetId)
  return building === undefined ? position.x : position.x + (building.footprint.width * FIXED_SCALE) / 2
}

function lookAtX(world: World, order: Order | undefined): number | undefined {
  if (order?.type === 'BUILD' || order?.type === 'REPAIR') {
    const targetId = order.type === 'BUILD' ? order.buildingId : order.targetId
    return targetCenterX(world, targetId)
  }
  return undefined
}

export function projectUnits(world: World): readonly SnapshotUnit[] {
  const positions = world.store(Position)
  const owners = world.store(Owner)
  const healths = world.store(Health)
  const kinds = world.store(Kind)
  const orders = world.store(Orders)
  const movements = world.store(Movement)
  const cargos = world.store(Cargo)
  return world
    .aliveIds()
    .filter((id) => kinds.has(id))
    .map((id) => {
      const pos = positions.get(id)
      const owner = owners.get(id)
      if (pos === undefined || owner === undefined) {
        throw new Error(`GameSession: entity ${id} is missing position or owner`)
      }
      const health = healths.get(id)
      const front = orders.get(id)?.queue[0]
      const cargo = cargos.get(id)
      const economy = projectEconomy(front, cargo)
      const targetX = lookAtX(world, front)
      return {
        id,
        x: pos.x,
        y: pos.y,
        owner: owner.owner,
        kind: kinds.get(id) ?? 'pawn',
        orderState: deriveOrderState(front, movements.get(id) !== undefined),
        ...(targetX === undefined ? {} : { lookAtX: targetX }),
        ...(front?.type === 'REPAIR'
          ? { repairProgressTicks: front.progressTicks, repairProgressMax: REPAIR_TICKS_PER_STEP }
          : {}),
        ...(economy === undefined ? {} : { economy }),
        ...(cargo === undefined || cargo.amount === 0 ? {} : { carrying: true }),
        ...(health === undefined ? {} : { hp: health.current, maxHp: health.max })
      }
    })
}
