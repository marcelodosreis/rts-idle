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
  SIMULATION_EVENT_TYPES,
  type SimulationEvent,
  TRAINABLE_UNIT_KINDS,
  UNIT_KINDS,
  type UnitKind
} from '@rts/shared'

/** High-level unit behavior for the renderer (drives idle/run/attack). */
export const ORDER_STATES = ['idle', 'moving', 'building', 'attacking', 'hold', 'patrol', 'attack_move'] as const

export type OrderState = (typeof ORDER_STATES)[number]

export type { EconomyPhase }
export { ECONOMY_PHASES }

export interface SnapshotEconomy {
  readonly phase: EconomyPhase
  readonly cargoAmount: number
  readonly cargoCapacity: number
  readonly progressTicks: number
  readonly progressMax: number
  readonly nodeId: EntityId
}

/** A unit as projected on the wire: position, owner, kind, combat state, order. */
export interface SnapshotUnit {
  readonly id: EntityId
  readonly x: Fixed
  readonly y: Fixed
  readonly owner: PlayerId
  readonly kind?: UnitKind
  readonly hp?: number
  readonly maxHp?: number
  readonly orderState?: OrderState
  readonly economy?: SnapshotEconomy
  /** True while the worker holds cargo, independent of its current order. */
  readonly carrying?: boolean
}

/** A competitive slot as projected on the wire. */
export interface SnapshotPlayer {
  readonly id: PlayerId
  readonly defeated: boolean
  readonly gold: number
  readonly usedSupply: number
  readonly reservedSupply?: number
  readonly supplyCap: number
}

export type ConstructionStatus = BuildingStatus
export { BUILDING_STATUSES }

/** Closed match lifecycle phases projected on the wire. */
export const MATCH_PHASES = ['RUNNING', 'FINISHED'] as const
export type MatchPhase = (typeof MATCH_PHASES)[number]

/** A building or foundation projected for authoritative world rendering. */
export interface SnapshotBuilding {
  readonly id: EntityId
  readonly buildingType: (typeof BUILDING_TYPES)[number]
  readonly x: Fixed
  readonly y: Fixed
  readonly owner: PlayerId
  /** Worker currently assigned to construction, or null while paused/completed. */
  readonly builderId?: EntityId | null
  readonly footprint: { readonly width: number; readonly height: number }
  readonly status: ConstructionStatus
  readonly progressTicks: number
  readonly totalTicks: number
  readonly rallyPoint?: { readonly x: Fixed; readonly y: Fixed } | null
  readonly production?: SnapshotProduction
}

export interface SnapshotProductionItem {
  readonly unitKind: (typeof TRAINABLE_UNIT_KINDS)[number]
  readonly costMinerals: number
  readonly reservedSupply: number
  readonly progressTicks: number
  readonly totalTicks: number
  readonly status: ProductionItemStatus
}

export interface SnapshotProduction {
  readonly queue: readonly SnapshotProductionItem[]
}

/** A neutral Mineral Node projected for rendering and contextual targeting. */
export interface SnapshotMineralNode {
  readonly id: EntityId
  readonly x: Fixed
  readonly y: Fixed
  readonly remaining: number
}

/** Server → client view of a completed tick. */
export interface SnapshotMessage {
  readonly type: 'snapshot'
  readonly tick: number
  readonly phase: MatchPhase
  readonly units: readonly SnapshotUnit[]
  readonly buildings: readonly SnapshotBuilding[]
  readonly mineralNodes: readonly SnapshotMineralNode[]
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
    (rallyPoint === undefined ||
      rallyPoint === null ||
      (isRecord(rallyPoint) && isInteger(field(rallyPoint, 'x')) && isInteger(field(rallyPoint, 'y')))) &&
    progressTicks <= totalTicks &&
    (production === undefined || isSnapshotProduction(production))
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
    return (
      isOneOf(TRAINABLE_UNIT_KINDS, field(item, 'unitKind')) &&
      isNonNegativeInteger(field(item, 'costMinerals')) &&
      isNonNegativeInteger(field(item, 'reservedSupply')) &&
      isOneOf(PRODUCTION_ITEM_STATUSES, field(item, 'status')) &&
      isNonNegativeInteger(progressTicks) &&
      isInteger(totalTicks) &&
      totalTicks > 0 &&
      progressTicks <= totalTicks
    )
  })
}

function isSnapshotMineralNode(value: unknown): boolean {
  return isPositionedEntity(value) && isRecord(value) && isNonNegativeInteger(field(value, 'remaining'))
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
    isInteger(field(value, 'nodeId')) &&
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
  return (
    isInteger(field(value, 'id')) &&
    isInteger(field(value, 'x')) &&
    isInteger(field(value, 'y')) &&
    isPlayerId(field(value, 'owner')) &&
    (kind === undefined || isOneOf(UNIT_KINDS, kind)) &&
    isOptionalNonNegativeInteger(field(value, 'hp')) &&
    isOptionalNonNegativeInteger(field(value, 'maxHp')) &&
    (orderState === undefined || isOneOf(ORDER_STATES, orderState)) &&
    (economy === undefined || isSnapshotEconomy(economy)) &&
    (carrying === undefined || typeof carrying === 'boolean')
  )
}

function isSnapshotPlayer(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }
  return (
    isInteger(field(value, 'id')) &&
    isPlayerId(field(value, 'id')) &&
    typeof field(value, 'defeated') === 'boolean' &&
    isInteger(field(value, 'gold')) &&
    isNonNegativeInteger(field(value, 'usedSupply')) &&
    isOptionalNonNegativeInteger(field(value, 'reservedSupply')) &&
    isNonNegativeInteger(field(value, 'supplyCap')) &&
    (field(value, 'supplyCap') as number) <= 200
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
  const mineralNodes = field(value, 'mineralNodes')
  const players = field(value, 'players')
  const events = field(value, 'events')
  return (
    field(value, 'type') === 'snapshot' &&
    isInteger(field(value, 'tick')) &&
    isOneOf(MATCH_PHASES, field(value, 'phase')) &&
    Array.isArray(units) &&
    units.every(isSnapshotUnit) &&
    Array.isArray(buildings) &&
    buildings.every(isSnapshotBuilding) &&
    Array.isArray(mineralNodes) &&
    mineralNodes.every(isSnapshotMineralNode) &&
    Array.isArray(players) &&
    players.every(isSnapshotPlayer) &&
    Array.isArray(events) &&
    events.every(isSimulationEvent)
  )
}
