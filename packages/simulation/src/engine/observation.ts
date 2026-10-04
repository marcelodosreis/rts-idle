import { BUILDING_DEFINITIONS, unitDefinitionFor } from '@rts/game-data'
import {
  type EconomyPhase,
  type EntityId,
  type Fixed,
  MOVEMENT_SPEED_SCALE,
  type OrderState,
  type PlayerId,
  type PlayerResources,
  type ResourceType,
  type UnitKind
} from '@rts/shared'
import type { Order } from '../contracts/orders.js'
import {
  effectiveArmor,
  effectiveCargoCapacity,
  effectiveDamage,
  effectiveMovementSpeed
} from '../domain/research-effects.js'
import { Building } from '../ecs/building-component.js'
import {
  AbilityCooldown,
  Cargo,
  Combat,
  Health,
  Kind,
  Movement,
  Orders,
  Owner,
  Position,
  Production,
  type ProductionItem
} from '../ecs/components.js'
import type { ResourceAmount } from '../resources/resource-state.js'
import type { GameState, Phase, PlayerState } from '../state/state.js'

export interface ObservationEconomy {
  readonly phase: EconomyPhase
  readonly cargoAmount: number
  readonly cargoCapacity: number
  readonly progressTicks: number
  readonly progressMax: number
  readonly resourceId: number
}

export interface ObservationUnit {
  readonly id: EntityId
  readonly x: Fixed
  readonly y: Fixed
  readonly owner: PlayerId
  readonly kind: UnitKind
  readonly hp?: number
  readonly maxHp?: number
  readonly armor?: number
  readonly damage?: number
  readonly movementSpeedFixed?: number
  readonly cargoCapacity?: number
  readonly lookAtX?: Fixed
  readonly orderState: OrderState
  readonly repairProgressTicks?: number
  readonly repairProgressMax?: number
  readonly healCooldownRemaining?: number
  readonly economy?: ObservationEconomy
  readonly carrying?: boolean
  readonly cargoType?: ResourceType
  readonly canGather: boolean
  readonly canBuild: boolean
  readonly canRepair: boolean
  readonly repairable: boolean
  readonly acceptsDeposit: boolean
  readonly canHeal: boolean
  readonly canAttack: boolean
}

export interface ObservationBuilding {
  readonly id: EntityId
  readonly buildingType: typeof import('@rts/shared').BUILDING_TYPES[number]
  readonly x: Fixed
  readonly y: Fixed
  readonly owner: PlayerId
  readonly builderId: EntityId | null
  readonly footprint: { readonly width: number; readonly height: number }
  readonly status: typeof import('@rts/shared').BUILDING_STATUSES[number]
  readonly tier: number
  readonly tierUpgrade: { readonly progressTicks: number; readonly totalTicks: number } | null
  readonly progressTicks: number
  readonly totalTicks: number
  readonly hp?: number
  readonly maxHp?: number
  readonly rallyPoint: { readonly x: Fixed; readonly y: Fixed } | null
  readonly production?: { readonly queue: readonly ProductionItem[] }
}

export interface ObservationPlayer {
  readonly id: PlayerId
  readonly defeated: boolean
  readonly resources: Readonly<PlayerResources>
  readonly usedSupply: number
  readonly reservedSupply: number
  readonly supplyCap: number
  readonly completedResearch: readonly PlayerState['completedResearch'][number][]
  readonly queuedResearch: readonly PlayerState['completedResearch'][number][]
}

export interface SimulationObservation {
  readonly tick: number
  readonly phase: Phase
  readonly units: readonly ObservationUnit[]
  readonly buildings: readonly ObservationBuilding[]
  readonly players: readonly ObservationPlayer[]
  readonly resources: readonly ResourceAmount[]
  readonly resourcesComplete: boolean
}

function orderState(front: Order | undefined, hasMovement: boolean): OrderState {
  switch (front?.type) {
    case 'ATTACK':
      return 'attacking'
    case 'ATTACK_MOVE':
      return 'attack_move'
    case 'HOLD':
      return 'hold'
    case 'PATROL':
      return 'patrol'
    case 'BUILD':
      return hasMovement ? 'moving' : 'building'
    case 'REPAIR':
      return 'repairing'
    case 'HEAL':
      return 'healing'
    default:
      return hasMovement ? 'moving' : 'idle'
  }
}

function economy(
  front: Order | undefined,
  cargo: { readonly amount: number; readonly capacity: number } | undefined,
  state: GameState
): ObservationEconomy | undefined {
  if (front?.type !== 'GATHER' || cargo === undefined) {
    return undefined
  }
  const phaseByOrder: { readonly [K in typeof front.phase]: EconomyPhase } = {
    TO_RESOURCE: 'to_resource',
    HARVESTING: 'harvesting',
    TO_BASE: 'to_base',
    WAITING_FOR_BASE: 'waiting_for_base'
  }
  return {
    phase: phaseByOrder[front.phase],
    cargoAmount: cargo.amount,
    cargoCapacity: cargo.capacity,
    progressTicks: front.progressTicks,
    progressMax: state.resources.catalog.entry(front.resourceId)?.harvestTicks ?? 1,
    resourceId: front.resourceId
  }
}

function unitCapabilities(
  definition: ReturnType<typeof unitDefinitionFor>
): Pick<
  ObservationUnit,
  'canGather' | 'canBuild' | 'canRepair' | 'repairable' | 'acceptsDeposit' | 'canHeal' | 'canAttack'
> {
  return {
    canGather: definition.canGather,
    canBuild: definition.canBuild,
    canRepair: definition.canRepair,
    repairable: definition.repairable,
    acceptsDeposit: definition.acceptsDeposit,
    canHeal: definition.canHeal,
    canAttack: definition.canAttack
  }
}

function projectUnit(state: GameState, id: EntityId): ObservationUnit | undefined {
  const position = state.world.store(Position).get(id)
  const owner = state.world.store(Owner).get(id)
  const kind = state.world.store(Kind).get(id)
  if (position === undefined || owner === undefined || kind === undefined) {
    return undefined
  }
  const health = state.world.store(Health).get(id)
  const combat = state.world.store(Combat).get(id)
  const cargo = state.world.store(Cargo).get(id)
  const front = state.world.store(Orders).get(id)?.queue[0]
  const building = front?.type === 'BUILD' ? state.world.store(Building).get(front.buildingId) : undefined
  const targetPosition =
    front?.type === 'BUILD' || front?.type === 'REPAIR'
      ? state.world.store(Position).get(front.type === 'BUILD' ? front.buildingId : front.targetId)
      : undefined
  const definition = unitDefinitionFor(kind)
  const unitEconomy = economy(front, cargo, state)
  return {
    id,
    x: position.x,
    y: position.y,
    owner: owner.owner,
    kind,
    ...unitCapabilities(definition),
    ...(health === undefined ? {} : { hp: health.current, maxHp: health.max }),
    ...(combat === undefined
      ? {}
      : {
          armor: effectiveArmor(state, id),
          damage: effectiveDamage(state, id),
          movementSpeedFixed: effectiveMovementSpeed(
            state,
            id,
            definition.movementSpeedTilesPerSecond * MOVEMENT_SPEED_SCALE
          )
        }),
    ...(cargo === undefined
      ? {}
      : {
          cargoCapacity: effectiveCargoCapacity(state, id, cargo.capacity),
          ...(cargo.amount > 0 ? { carrying: true } : {}),
          ...(cargo.resourceType === null ? {} : { cargoType: cargo.resourceType })
        }),
    ...(targetPosition === undefined
      ? {}
      : { lookAtX: targetPosition.x + (building === undefined ? 0 : building.footprint.width * 128) }),
    orderState: orderState(front, state.world.store(Movement).has(id)),
    ...(front?.type === 'REPAIR' ? { repairProgressTicks: front.progressTicks, repairProgressMax: 10 } : {}),
    ...(state.world.store(AbilityCooldown).get(id)?.healCooldownRemaining
      ? { healCooldownRemaining: state.world.store(AbilityCooldown).get(id)!.healCooldownRemaining }
      : {}),
    ...(unitEconomy === undefined ? {} : { economy: unitEconomy })
  }
}

function projectBuilding(state: GameState, id: EntityId): ObservationBuilding | undefined {
  const building = state.world.store(Building).get(id)
  const position = state.world.store(Position).get(id)
  const owner = state.world.store(Owner).get(id)
  if (building === undefined || position === undefined || owner === undefined) {
    return undefined
  }
  const definition = BUILDING_DEFINITIONS[building.buildingType]
  const health = state.world.store(Health).get(id)
  const production = state.world.store(Production).get(id)
  return {
    id,
    buildingType: building.buildingType,
    x: position.x,
    y: position.y,
    owner: owner.owner,
    builderId: building.builderId,
    footprint: { width: building.footprint.width, height: building.footprint.height },
    status: building.status,
    tier: building.tier ?? 1,
    tierUpgrade:
      building.tierUpgrade === undefined || building.tierUpgrade === null
        ? null
        : {
            progressTicks: building.tierUpgrade.progressTicks,
            totalTicks: building.tierUpgrade.totalTicks
          },
    progressTicks: building.progressTicks,
    totalTicks: building.totalTicks,
    ...(health === undefined ? {} : { hp: health.current, maxHp: health.max ?? definition.maxHp }),
    rallyPoint:
      building.rallyPoint === undefined || building.rallyPoint === null
        ? null
        : { x: building.rallyPoint.x, y: building.rallyPoint.y },
    ...(production === undefined
      ? {}
      : {
          production: {
            queue: production.queue.map((item) => ({ ...item, cost: { ...item.cost } }))
          }
        })
  }
}

function projectPlayer(state: GameState, player: PlayerState): ObservationPlayer {
  const queuedResearch = new Set<PlayerState['completedResearch'][number]>()
  for (const id of state.world.query(Building, Owner, Production)) {
    if (
      state.world.store(Owner).get(id)?.owner !== player.id ||
      !BUILDING_DEFINITIONS[state.world.store(Building).get(id)!.buildingType].capabilities.canResearch
    ) {
      continue
    }
    for (const item of state.world.store(Production).get(id)?.queue ?? []) {
      if (item.researchType !== undefined) {
        queuedResearch.add(item.researchType)
      }
    }
  }
  return {
    id: player.id,
    defeated: player.defeated,
    resources: { ...player.resources },
    usedSupply: player.usedSupply,
    reservedSupply: player.reservedSupply,
    supplyCap: player.supplyCap,
    completedResearch: [...player.completedResearch],
    queuedResearch: [...queuedResearch]
  }
}

export function createSimulationObservation(
  state: GameState,
  completeResources: boolean,
  entityIds?: readonly EntityId[]
): SimulationObservation {
  const unitIds = entityIds ?? state.world.query(Kind)
  const buildingIds = entityIds ?? state.world.query(Building)
  return {
    tick: state.tick,
    phase: state.phase,
    units: unitIds.flatMap((id) => {
      const unit = projectUnit(state, id)
      return unit === undefined ? [] : [unit]
    }),
    buildings: buildingIds.flatMap((id) => {
      const building = projectBuilding(state, id)
      return building === undefined ? [] : [building]
    }),
    players: state.players.map((player) => projectPlayer(state, player)),
    resources: completeResources ? state.resources.all() : state.resources.changed(),
    resourcesComplete: completeResources
  }
}
