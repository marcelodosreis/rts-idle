import type { SnapshotUnit } from '@rts/protocol'
import { Cargo, Health, Kind, Movement, Orders, Owner, Position, type World } from '@rts/simulation'
import { projectEconomy } from './economy.js'
import { deriveOrderState } from './order-state.js'

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
      return {
        id,
        x: pos.x,
        y: pos.y,
        owner: owner.owner,
        kind: kinds.get(id) ?? 'pawn',
        orderState: deriveOrderState(front, movements.get(id) !== undefined),
        ...(economy === undefined ? {} : { economy }),
        ...(cargo === undefined || cargo.amount === 0 ? {} : { carrying: true }),
        ...(health === undefined ? {} : { hp: health.current, maxHp: health.max })
      }
    })
}
