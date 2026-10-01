import type { SnapshotUnit } from '@rts/protocol'
import { FIXED_SCALE, MOVEMENT_SPEED_SCALE, type ResourceType } from '@rts/shared'
import type { PlayerState } from '@rts/simulation'
import {
  AbilityCooldown,
  Building,
  Cargo,
  Combat,
  Health,
  Kind,
  Movement,
  type Order,
  Orders,
  Owner,
  Position,
  REPAIR_TICKS_PER_STEP,
  type ResourceCatalog,
  unitStatsFor,
  type World
} from '@rts/simulation'
import { projectEconomy } from './economy.js'
import { deriveOrderState } from './order-state.js'

interface CarryProjection {
  readonly carrying?: boolean
  readonly cargoType?: ResourceType
}

function carryProjection(
  cargo: { readonly amount: number; readonly resourceType: ResourceType | null } | undefined
): CarryProjection {
  if (cargo === undefined || cargo.amount === 0) {
    return {}
  }
  return cargo.resourceType === null ? { carrying: true } : { carrying: true, cargoType: cargo.resourceType }
}

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

function projectArmor(world: World, id: number, players: readonly PlayerState[]): number | undefined {
  const combat = world.store(Combat).get(id)
  const owner = world.store(Owner).get(id)
  const kind = world.store(Kind).get(id)
  if (combat === undefined || owner === undefined || kind === undefined) {
    return undefined
  }
  const player = players.find((candidate) => candidate.id === owner.owner)
  return (
    combat.armor + (unitStatsFor(kind).militaryDefenseUpgrade && player?.completedResearch.includes('DEFENSE') ? 1 : 0)
  )
}

function projectDamage(world: World, id: number, players: readonly PlayerState[]): number | undefined {
  const combat = world.store(Combat).get(id)
  const owner = world.store(Owner).get(id)
  const kind = world.store(Kind).get(id)
  if (combat === undefined || owner === undefined || kind === undefined) {
    return undefined
  }
  const player = players.find((candidate) => candidate.id === owner.owner)
  return (
    combat.damage + (unitStatsFor(kind).militaryAttackUpgrade && player?.completedResearch.includes('ATTACK') ? 2 : 0)
  )
}

function projectMovementSpeed(world: World, id: number, players: readonly PlayerState[]): number | undefined {
  const owner = world.store(Owner).get(id)
  const kind = world.store(Kind).get(id)
  if (owner === undefined || kind === undefined) {
    return undefined
  }
  const stats = unitStatsFor(kind)
  const player = players.find((candidate) => candidate.id === owner.owner)
  const baseSpeed = stats.movementSpeedTilesPerSecond * MOVEMENT_SPEED_SCALE
  return stats.movementUpgrade && player?.completedResearch.includes('MOVEMENT') ? (baseSpeed * 11) / 10 : baseSpeed
}

function projectHealCooldown(world: World, id: number): number | undefined {
  const cooldown = world.store(AbilityCooldown).get(id)?.healCooldownRemaining
  return cooldown === undefined || cooldown === 0 ? undefined : cooldown
}

export function projectUnits(
  world: World,
  players: readonly PlayerState[] = [],
  resources: ResourceCatalog
): readonly SnapshotUnit[] {
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
      const armor = projectArmor(world, id, players)
      const damage = projectDamage(world, id, players)
      const movementSpeedFixed = projectMovementSpeed(world, id, players)
      const front = orders.get(id)?.queue[0]
      const cargo = cargos.get(id)
      const economy = projectEconomy(front, cargo, resources)
      const healCooldownRemaining = projectHealCooldown(world, id)
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
        ...carryProjection(cargo),
        ...(health === undefined ? {} : { hp: health.current, maxHp: health.max }),
        ...(armor === undefined ? {} : { armor }),
        ...(damage === undefined ? {} : { damage }),
        ...(movementSpeedFixed === undefined ? {} : { movementSpeedFixed }),
        ...(cargo === undefined ? {} : { cargoCapacity: cargo.capacity }),
        ...(healCooldownRemaining === undefined ? {} : { healCooldownRemaining })
      }
    })
}
