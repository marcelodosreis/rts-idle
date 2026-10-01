import {
  BUILDING_STATUSES,
  BUILDING_TYPES,
  type BuildingStatus,
  ECONOMY_PHASES,
  type EconomyPhase,
  type EntityId,
  type Fixed,
  field,
  isInteger,
  isNonNegativeInteger,
  isOneOf,
  isOptionalNonNegativeInteger,
  isPlayerId,
  isRecord,
  type PlayerId,
  PRODUCTION_ITEM_STATUSES,
  type ProductionItemStatus,
  REPAIR_STOP_REASONS,
  RESEARCH_TYPES,
  RESOURCE_TYPES,
  type ResearchType,
  type ResourceCost,
  type ResourceId,
  type ResourceType,
  SIMULATION_EVENT_TYPES,
  type SimulationEvent,
  TRAINABLE_UNIT_KINDS,
  UNIT_KINDS,
  type UnitKind
} from '@rts/shared'
import { isSnapshotPlayer } from './snapshot-guards.js'

export const ORDER_STATES = [
  'idle',
  'moving',
  'building',
  'attacking',
  'healing',
  'repairing',
  'hold',
  'patrol',
  'attack_move'
] as const

export type OrderState = (typeof ORDER_STATES)[number]

export type { EconomyPhase }
export { ECONOMY_PHASES }

export interface SnapshotEconomy {
  readonly phase: EconomyPhase
  readonly cargoAmount: number
  readonly cargoCapacity: number
  readonly progressTicks: number
  readonly progressMax: number
  readonly resourceId: ResourceId
}

export interface SnapshotUnit {
  readonly id: EntityId
  readonly x: Fixed
  readonly y: Fixed
  readonly owner: PlayerId
  readonly kind?: UnitKind
  readonly hp?: number
  readonly maxHp?: number
  readonly armor?: number
  readonly damage?: number
  readonly movementSpeedFixed?: number
  readonly cargoCapacity?: number
  readonly lookAtX?: Fixed
  readonly orderState?: OrderState
  readonly repairProgressTicks?: number
  readonly repairProgressMax?: number
  readonly healCooldownRemaining?: number
  readonly economy?: SnapshotEconomy
  readonly carrying?: boolean
  /** Carried resource type, so the renderer can show wood vs gold after the order is gone. */
  readonly cargoType?: ResourceType
}

export interface SnapshotPlayer {
  readonly id: PlayerId
  readonly defeated: boolean
  readonly resources: { readonly GOLD: number; readonly WOOD: number }
  readonly usedSupply: number
  readonly reservedSupply?: number
  readonly supplyCap: number
  readonly highestCastleTierReached?: number
  readonly completedResearch?: readonly ResearchType[]
  readonly queuedResearch?: readonly ResearchType[]
}

export type ConstructionStatus = BuildingStatus
export { BUILDING_STATUSES }

export const MATCH_PHASES = ['RUNNING', 'FINISHED'] as const
export type MatchPhase = (typeof MATCH_PHASES)[number]

export interface SnapshotBuilding {
  readonly id: EntityId
  readonly buildingType: (typeof BUILDING_TYPES)[number]
  readonly x: Fixed
  readonly y: Fixed
  readonly owner: PlayerId
  readonly builderId?: EntityId | null
  readonly footprint: { readonly width: number; readonly height: number }
  readonly status: ConstructionStatus
  readonly tier?: number
  readonly tierUpgrade?: { readonly progressTicks: number; readonly totalTicks: number } | null
  readonly progressTicks: number
  readonly totalTicks: number
  readonly hp?: number
  readonly maxHp?: number
  readonly rallyPoint?: { readonly x: Fixed; readonly y: Fixed } | null
  readonly production?: SnapshotProduction
}

export interface SnapshotUnitProductionItem {
  readonly unitKind: (typeof TRAINABLE_UNIT_KINDS)[number]
  readonly cost: ResourceCost
  readonly reservedSupply: number
  readonly progressTicks: number
  readonly totalTicks: number
  readonly status: ProductionItemStatus
}

export interface SnapshotResearchProductionItem {
  readonly researchType: ResearchType
  readonly cost: ResourceCost
  readonly progressTicks: number
  readonly totalTicks: number
  readonly status: ProductionItemStatus
}

export type SnapshotProductionItem = SnapshotUnitProductionItem | SnapshotResearchProductionItem

export interface SnapshotProduction {
  readonly queue: readonly SnapshotProductionItem[]
}

/** Mutable resource state; static definitions are delivered in MatchConfig.map. */
export interface SnapshotResource {
  readonly resourceId: ResourceId
  readonly remaining: number
}

export interface SnapshotMessage {
  readonly type: 'snapshot'
  readonly tick: number
  readonly phase: MatchPhase
  readonly units: readonly SnapshotUnit[]
  readonly buildings: readonly SnapshotBuilding[]
  readonly resources: readonly SnapshotResource[]
  readonly resourcesComplete: boolean
  readonly players: readonly SnapshotPlayer[]
  readonly events: readonly SimulationEvent[]
}
function isPositionedEntity(value: unknown): boolean {
  return (
    isRecord(value) && isInteger(field(value, 'id')) && isInteger(field(value, 'x')) && isInteger(field(value, 'y'))
  )
}
function isFootprint(value: unknown): boolean {
  return (
    isRecord(value) &&
    isInteger(field(value, 'width')) &&
    isInteger(field(value, 'height')) &&
    (field(value, 'width') as number) > 0 &&
    (field(value, 'height') as number) > 0
  )
}
function isSnapshotBuilding(value: unknown): boolean {
  if (!isPositionedEntity(value) || !isRecord(value)) {
    return false
  }
  const builderId = field(value, 'builderId')
  const progressTicks = field(value, 'progressTicks')
  const totalTicks = field(value, 'totalTicks')
  const production = field(value, 'production')
  const tierUpgrade = field(value, 'tierUpgrade')
  const upgradeProgress =
    tierUpgrade === undefined || tierUpgrade === null || !isRecord(tierUpgrade)
      ? undefined
      : field(tierUpgrade, 'progressTicks')
  const upgradeTotal =
    tierUpgrade === undefined || tierUpgrade === null || !isRecord(tierUpgrade)
      ? undefined
      : field(tierUpgrade, 'totalTicks')
  const rallyPoint = field(value, 'rallyPoint')
  return (
    isOneOf(BUILDING_TYPES, field(value, 'buildingType')) &&
    isPlayerId(field(value, 'owner')) &&
    (builderId === undefined || builderId === null || isNonNegativeInteger(builderId)) &&
    isFootprint(field(value, 'footprint')) &&
    isOneOf(BUILDING_STATUSES, field(value, 'status')) &&
    isOptionalNonNegativeInteger(progressTicks) &&
    isOptionalNonNegativeInteger(totalTicks) &&
    isInteger(progressTicks) &&
    isInteger(totalTicks) &&
    totalTicks > 0 &&
    isOptionalNonNegativeInteger(field(value, 'hp')) &&
    isOptionalNonNegativeInteger(field(value, 'maxHp')) &&
    isOptionalNonNegativeInteger(field(value, 'tier')) &&
    isOptionalNonNegativeInteger(field(value, 'armor')) &&
    (rallyPoint === undefined ||
      rallyPoint === null ||
      (isRecord(rallyPoint) && isInteger(field(rallyPoint, 'x')) && isInteger(field(rallyPoint, 'y')))) &&
    progressTicks <= totalTicks &&
    (production === undefined || isSnapshotProduction(production)) &&
    (tierUpgrade === undefined ||
      tierUpgrade === null ||
      (isRecord(tierUpgrade) &&
        isNonNegativeInteger(field(tierUpgrade, 'progressTicks')) &&
        isNonNegativeInteger(field(tierUpgrade, 'totalTicks')) &&
        isInteger(upgradeProgress) &&
        isInteger(upgradeTotal) &&
        upgradeTotal > 0 &&
        upgradeProgress <= upgradeTotal))
  )
}
function isSnapshotProduction(value: unknown): value is SnapshotProduction {
  if (!isRecord(value)) {
    return false
  }
  const queue = field(value, 'queue')
  if (!Array.isArray(queue)) {
    return false
  }
  return queue.every((item) => {
    if (!isRecord(item)) {
      return false
    }
    const progressTicks = field(item, 'progressTicks')
    const totalTicks = field(item, 'totalTicks')
    const researchType = field(item, 'researchType')
    if (researchType !== undefined) {
      return (
        isOneOf(RESEARCH_TYPES, researchType) &&
        isSnapshotResourceCost(field(item, 'cost')) &&
        isOneOf(PRODUCTION_ITEM_STATUSES, field(item, 'status')) &&
        isNonNegativeInteger(progressTicks) &&
        isInteger(totalTicks) &&
        totalTicks > 0 &&
        progressTicks <= totalTicks
      )
    }
    return (
      isOneOf(TRAINABLE_UNIT_KINDS, field(item, 'unitKind')) &&
      isSnapshotResourceCost(field(item, 'cost')) &&
      isNonNegativeInteger(field(item, 'reservedSupply')) &&
      isOneOf(PRODUCTION_ITEM_STATUSES, field(item, 'status')) &&
      isNonNegativeInteger(progressTicks) &&
      isInteger(totalTicks) &&
      totalTicks > 0 &&
      progressTicks <= totalTicks
    )
  })
}
function isSnapshotResource(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonNegativeInteger(field(value, 'resourceId')) &&
    isNonNegativeInteger(field(value, 'remaining'))
  )
}
function isSnapshotResourceCost(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }
  const gold = field(value, 'GOLD')
  const wood = field(value, 'WOOD')
  return isNonNegativeInteger(gold) && (wood === undefined || isNonNegativeInteger(wood))
}
function isSnapshotEconomy(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }
  const cargoAmount = field(value, 'cargoAmount')
  const cargoCapacity = field(value, 'cargoCapacity')
  const progressTicks = field(value, 'progressTicks')
  const progressMax = field(value, 'progressMax')
  return (
    isOneOf(ECONOMY_PHASES, field(value, 'phase')) &&
    isOptionalNonNegativeInteger(cargoAmount) &&
    isOptionalNonNegativeInteger(cargoCapacity) &&
    isOptionalNonNegativeInteger(progressTicks) &&
    isOptionalNonNegativeInteger(progressMax) &&
    isNonNegativeInteger(field(value, 'resourceId')) &&
    isInteger(cargoAmount) &&
    isInteger(cargoCapacity) &&
    isInteger(progressTicks) &&
    isInteger(progressMax) &&
    cargoCapacity > 0 &&
    progressMax > 0 &&
    cargoAmount <= cargoCapacity &&
    progressTicks <= progressMax
  )
}
function isSnapshotUnit(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }
  const kind = field(value, 'kind')
  const orderState = field(value, 'orderState')
  const economy = field(value, 'economy')
  const carrying = field(value, 'carrying')
  const cargoType = field(value, 'cargoType')
  return (
    isInteger(field(value, 'id')) &&
    isInteger(field(value, 'x')) &&
    isInteger(field(value, 'y')) &&
    isPlayerId(field(value, 'owner')) &&
    (kind === undefined || isOneOf(UNIT_KINDS, kind)) &&
    isOptionalNonNegativeInteger(field(value, 'hp')) &&
    isOptionalNonNegativeInteger(field(value, 'maxHp')) &&
    isOptionalNonNegativeInteger(field(value, 'armor')) &&
    isOptionalNonNegativeInteger(field(value, 'damage')) &&
    isOptionalNonNegativeInteger(field(value, 'movementSpeedFixed')) &&
    isOptionalNonNegativeInteger(field(value, 'cargoCapacity')) &&
    isOptionalNonNegativeInteger(field(value, 'repairProgressTicks')) &&
    isOptionalNonNegativeInteger(field(value, 'repairProgressMax')) &&
    isOptionalNonNegativeInteger(field(value, 'healCooldownRemaining')) &&
    (field(value, 'lookAtX') === undefined || isInteger(field(value, 'lookAtX'))) &&
    (orderState === undefined || isOneOf(ORDER_STATES, orderState)) &&
    (economy === undefined || isSnapshotEconomy(economy)) &&
    (carrying === undefined || typeof carrying === 'boolean') &&
    (cargoType === undefined || isOneOf(RESOURCE_TYPES, cargoType))
  )
}
function isSimulationEvent(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }
  const type = field(value, 'type')
  if (!isOneOf(SIMULATION_EVENT_TYPES, type)) {
    return false
  }
  switch (type) {
    case 'attackFired':
      return isInteger(field(value, 'attackerId')) && isInteger(field(value, 'targetId'))
    case 'damageDealt':
      return (
        isInteger(field(value, 'targetId')) && isInteger(field(value, 'amount')) && isInteger(field(value, 'targetHp'))
      )
    case 'healCast':
      return (
        isInteger(field(value, 'healerId')) &&
        isInteger(field(value, 'targetId')) &&
        isInteger(field(value, 'amount')) &&
        isInteger(field(value, 'targetHp'))
      )
    case 'repairStopped':
      return (
        isInteger(field(value, 'workerId')) &&
        isInteger(field(value, 'targetId')) &&
        isOneOf(REPAIR_STOP_REASONS, field(value, 'reason'))
      )
    case 'unitDied': {
      const killerId = field(value, 'killerId')
      return (
        isInteger(field(value, 'entityId')) &&
        isPlayerId(field(value, 'owner')) &&
        (killerId === null || isInteger(killerId))
      )
    }
    default:
      return false
  }
}

/** Type guard for untrusted wire input; the client ignores non-conforming messages. */
export function isSnapshotMessage(value: unknown): value is SnapshotMessage {
  if (!isRecord(value)) {
    return false
  }
  const units = field(value, 'units')
  const buildings = field(value, 'buildings')
  const resources = field(value, 'resources')
  const players = field(value, 'players')
  const events = field(value, 'events')
  const resourcesComplete = field(value, 'resourcesComplete')
  return (
    field(value, 'type') === 'snapshot' &&
    isInteger(field(value, 'tick')) &&
    isOneOf(MATCH_PHASES, field(value, 'phase')) &&
    Array.isArray(units) &&
    units.every(isSnapshotUnit) &&
    Array.isArray(buildings) &&
    buildings.every(isSnapshotBuilding) &&
    Array.isArray(resources) &&
    resources.every(isSnapshotResource) &&
    typeof resourcesComplete === 'boolean' &&
    Array.isArray(players) &&
    players.every(isSnapshotPlayer) &&
    Array.isArray(events) &&
    events.every(isSimulationEvent)
  )
}
