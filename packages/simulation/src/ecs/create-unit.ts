import type { EntityId, PlayerId, UnitKind } from '@rts/shared'
import { MINERAL_CARGO_CAPACITY } from '../data/economy-rules.js'
import { unitStatsFor } from '../data/unit-stats.js'
import { AbilityCooldown, Cargo, Combat, Health, Kind, Orders, Owner, Position } from './components.js'
import type { World } from './world.js'

export interface CreateUnitOptions {
  readonly id: EntityId
  readonly x: number
  readonly y: number
  readonly owner: PlayerId
  readonly kind: UnitKind
  readonly worker?: boolean
}

/** Creates every unit with the complete canonical component set. */
export function createUnitEntity(world: World, options: CreateUnitOptions): void {
  const stats = unitStatsFor(options.kind)
  world.createEntity(options.id)
  world.store(Position).set(options.id, { x: options.x, y: options.y })
  world.store(Owner).set(options.id, { owner: options.owner })
  world.store(Kind).set(options.id, options.kind)
  world.store(Health).set(options.id, { current: stats.maxHp, max: stats.maxHp })
  world.store(Combat).set(options.id, {
    armor: stats.armor,
    damage: stats.damage,
    rangeTiles: stats.rangeTiles,
    cooldownTicks: stats.cooldownTicks,
    cooldownRemaining: 0
  })
  world.store(AbilityCooldown).set(options.id, { healCooldownRemaining: 0 })
  world.store(Orders).set(options.id, { queue: [] })
  if (options.worker === true) {
    world.store(Cargo).set(options.id, { amount: 0, capacity: MINERAL_CARGO_CAPACITY })
  }
}
