import {
  BUILDING_DEFINITIONS,
  RESEARCH_DEFINITIONS,
  UNIT_PRODUCTION_DEFINITIONS,
  unitDefinitionFor
} from '@rts/game-data'
import { FIXED_SCALE, type ProductionItemStatus, RESOURCE_TYPES, type ResourceCost } from '@rts/shared'
import { RESOURCE_CARGO_CAPACITY } from '../data/economy-rules.js'
import { MAX_PRODUCTION_QUEUE } from '../data/production-rules.js'
import { MAX_SUPPLY_CAPACITY } from '../data/supply-rules.js'
import { effectiveCargoCapacity } from '../domain/research-effects.js'
import { Building } from '../ecs/building-component.js'
import {
  Cargo,
  Combat,
  Health,
  isResearchProductionItem,
  Kind,
  Orders,
  Owner,
  Position,
  Production,
  type ResearchProductionItem,
  type UnitProductionItem
} from '../ecs/components.js'
import {
  type BuildingFootprint,
  type PlacementMapBounds,
  validateBuildingPlacement
} from '../placement/building-placement.js'
import type { GameState } from '../state/state.js'

/** Raised when a central invariant no longer holds (master plan P1.08). */
export class InvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvariantError'
  }
}

/** Validates the footprints already admitted to a building collection. */
export function checkBuildingFootprints(mapBounds: PlacementMapBounds, footprints: readonly BuildingFootprint[]): void {
  for (const [index, footprint] of footprints.entries()) {
    const result = validateBuildingPlacement(mapBounds, footprints.slice(0, index), footprint)
    if (result.ok === true) {
      continue
    }
    throw new InvariantError(`check-invariants: building footprint ${index} is ${result.reason}`)
  }
}

function fail(invariant: string): never {
  throw new InvariantError(`check-invariants: ${invariant}`)
}

function costsEqual(first: ResourceCost, second: ResourceCost): boolean {
  return RESOURCE_TYPES.every((type) => (first[type] ?? 0) === (second[type] ?? 0))
}

function checkConstruction(state: GameState, id: number): void {
  const kinds = state.world.store(Kind)
  const owners = state.world.store(Owner)
  const construction = state.world.store(Building).get(id)
  if (construction === undefined) {
    return
  }
  if (owners.get(id) === undefined) {
    fail(`construction ${id} has no owner`)
  }
  const position = state.world.store(Position).get(id)
  if (
    position === undefined ||
    position.x !== construction.footprint.x * FIXED_SCALE ||
    position.y !== construction.footprint.y * FIXED_SCALE
  ) {
    fail(`construction ${id} position does not match footprint origin`)
  }
  if (
    !Number.isInteger(construction.progressTicks) ||
    construction.progressTicks < 0 ||
    construction.progressTicks > construction.totalTicks
  ) {
    fail(`construction ${id} has invalid progress ${construction.progressTicks}/${construction.totalTicks}`)
  }
  if (!Number.isInteger(construction.totalTicks) || construction.totalTicks <= 0) {
    fail(`construction ${id} has invalid duration ${construction.totalTicks}`)
  }
  if (construction.status === 'COMPLETED' && construction.progressTicks !== construction.totalTicks) {
    fail(`completed building ${id} is incomplete`)
  }
  if (construction.builderId !== null) {
    const builderKind = kinds.get(construction.builderId)
    if (
      !state.world.hasEntity(construction.builderId) ||
      builderKind === undefined ||
      !unitDefinitionFor(builderKind).canBuild
    ) {
      fail(`construction ${id} references missing worker ${construction.builderId}`)
    }
  }
  if (construction.rallyPoint !== undefined && construction.rallyPoint !== null) {
    if (!BUILDING_DEFINITIONS[construction.buildingType].capabilities.canProduce) {
      fail(`construction ${id} has a rally point but cannot produce units`)
    }
    if (!Number.isInteger(construction.rallyPoint.x) || !Number.isInteger(construction.rallyPoint.y)) {
      fail(`construction ${id} has invalid rally point`)
    }
  }
}

function checkEconomyEntity(state: GameState, id: number): void {
  const owners = state.world.store(Owner)
  const kinds = state.world.store(Kind)
  checkConstruction(state, id)
  const cargo = state.world.store(Cargo).get(id)
  const expectedCapacity = effectiveCargoCapacity(state, id, RESOURCE_CARGO_CAPACITY)
  if (
    cargo !== undefined &&
    (!Number.isInteger(cargo.amount) ||
      cargo.amount < 0 ||
      cargo.amount > cargo.capacity ||
      cargo.capacity !== expectedCapacity)
  ) {
    fail(`entity ${id} has invalid cargo ${cargo.amount}/${cargo.capacity}`)
  }
  const kind = kinds.get(id)
  if (
    cargo !== undefined &&
    (kind === undefined || !unitDefinitionFor(kind).acceptsDeposit || owners.get(id) === undefined)
  ) {
    fail(`entity ${id} has cargo without being an owned worker`)
  }
  if (cargo !== undefined && (cargo.amount === 0) !== (cargo.resourceType === null)) {
    fail(`entity ${id} has cargo type inconsistent with amount`)
  }
  const frontOrder = state.world.store(Orders).get(id)?.queue[0]
  if (
    frontOrder?.type === 'GATHER' &&
    (cargo === undefined || kind === undefined || !unitDefinitionFor(kind).canGather || owners.get(id) === undefined)
  ) {
    fail(`entity ${id} has gather order without Worker state`)
  }
  if (
    frontOrder?.type === 'DEPOSIT' &&
    (cargo === undefined ||
      kind === undefined ||
      !unitDefinitionFor(kind).acceptsDeposit ||
      owners.get(id) === undefined)
  ) {
    fail(`entity ${id} has deposit order without Worker state`)
  }
  if (frontOrder?.type === 'BUILD' && state.world.store(Building).get(frontOrder.buildingId) === undefined) {
    fail(`entity ${id} has build order referencing missing construction ${frontOrder.buildingId}`)
  }
  const gatherOrder = frontOrder
  if (gatherOrder?.type === 'GATHER') {
    const resource = state.resources.catalog.entry(gatherOrder.resourceId)
    if (resource === undefined) {
      fail(`entity ${id} gathers missing resource ${gatherOrder.resourceId}`)
    }
    if (gatherOrder.progressTicks < 0 || gatherOrder.progressTicks >= resource.harvestTicks) {
      fail(`entity ${id} has invalid gather progress ${gatherOrder.progressTicks}`)
    }
  }
}

function checkQueueItemStatus(id: number, index: number, status: ProductionItemStatus): void {
  if (index === 0 && status === 'QUEUED') {
    fail(`production ${id} has queued active item`)
  }
  if (index > 0 && status === 'ACTIVE') {
    fail(`production ${id} has multiple active items`)
  }
}

function checkResearchItem(id: number, index: number, item: ResearchProductionItem): void {
  const definition = RESEARCH_DEFINITIONS[item.researchType]
  if (!costsEqual(item.cost, definition.cost) || item.totalTicks !== definition.researchTicks) {
    fail(`production ${id} has stale Research definition for ${item.researchType}`)
  }
  if (item.status === 'COMPLETED_WAITING') {
    fail(`production ${id} has completed Research waiting in queue`)
  }
  checkQueueItemStatus(id, index, item.status)
}

function checkUnitItem(id: number, index: number, item: UnitProductionItem): number {
  const definition = UNIT_PRODUCTION_DEFINITIONS[item.unitKind]
  if (!costsEqual(item.cost, definition.cost) || item.reservedSupply !== definition.supply) {
    fail(`production ${id} has stale definition for ${item.unitKind}`)
  }
  if (!Number.isInteger(item.progressTicks) || item.progressTicks < 0 || item.progressTicks > item.totalTicks) {
    fail(`production ${id} has invalid progress`)
  }
  if (item.totalTicks !== definition.trainingTicks) {
    fail(`production ${id} has invalid duration`)
  }
  checkQueueItemStatus(id, index, item.status)
  return item.reservedSupply
}

function checkProduction(state: GameState, id: number, reserved: Map<number, number>): void {
  const production = state.world.store(Production).get(id)
  if (production === undefined) {
    return
  }
  const building = state.world.store(Building).get(id)
  const owner = state.world.store(Owner).get(id)?.owner
  if (
    building === undefined ||
    !BUILDING_DEFINITIONS[building.buildingType].capabilities.canProduce ||
    building.status !== 'COMPLETED' ||
    owner === undefined
  ) {
    fail(`production ${id} has no completed owned producer`)
  }
  if (production.queue.length > MAX_PRODUCTION_QUEUE) {
    fail(`production ${id} exceeds queue limit`)
  }
  if (
    production.queue.length > 0 &&
    building !== undefined &&
    BUILDING_DEFINITIONS[building.buildingType].capabilities.canUpgrade &&
    building.tierUpgrade !== undefined &&
    building.tierUpgrade !== null
  ) {
    fail(`production ${id} has a Pawn queue during Castle upgrade`)
  }
  let totalReserved = 0
  for (const [index, item] of production.queue.entries()) {
    if (isResearchProductionItem(item)) {
      checkResearchItem(id, index, item)
      continue
    }
    totalReserved += checkUnitItem(id, index, item)
  }
  reserved.set(owner, (reserved.get(owner) ?? 0) + totalReserved)
}

/** Validates one entity: position required, health bounded, combat stats sane. */
function checkEntity(state: GameState, id: number): void {
  const positions = state.world.store(Position)
  const healths = state.world.store(Health)
  const combats = state.world.store(Combat)
  if (positions.get(id) === undefined) {
    fail(`entity ${id} has no position`)
  }
  const health = healths.get(id)
  if (health !== undefined) {
    if (health.max <= 0 || health.current < 0 || health.current > health.max) {
      fail(`entity ${id} has invalid health ${health.current}/${health.max}`)
    }
  }
  checkEconomyEntity(state, id)
  const combat = combats.get(id)
  if (combat === undefined) {
    return
  }
  if (combat.damage < 0 || combat.rangeTiles < 0 || combat.cooldownTicks < 0) {
    fail(`entity ${id} has negative combat stats`)
  }
  if (combat.cooldownRemaining < 0 || combat.cooldownRemaining > combat.cooldownTicks) {
    fail(`entity ${id} has cooldown ${combat.cooldownRemaining} outside [0, ${combat.cooldownTicks}]`)
  }
  if (healths.get(id) === undefined) {
    fail(`entity ${id} can fight without health`)
  }
}

/** Validates the player slots and that no defeated player still owns units. */
function checkPlayers(state: GameState): void {
  const playerIds = state.players.map((player) => player.id)
  if (state.players.length !== 4 || new Set(playerIds).size !== 4) {
    fail('player slots are not exactly the four competitive ids')
  }
  const owners = state.world.store(Owner)
  const aliveOwners = new Set<number>()
  for (const id of state.world.query(Owner)) {
    const owner = owners.get(id)?.owner
    if (owner !== undefined) {
      aliveOwners.add(owner)
    }
  }
  for (const player of state.players) {
    for (const type of RESOURCE_TYPES) {
      if (!Number.isInteger(player.resources[type]) || player.resources[type] < 0) {
        fail(`player ${player.id} has invalid ${type.toLowerCase()} balance ${player.resources[type]}`)
      }
    }
    if (!Number.isInteger(player.usedSupply) || player.usedSupply < 0) {
      fail(`player ${player.id} has invalid used supply ${player.usedSupply}`)
    }
    if (!Number.isInteger(player.reservedSupply) || player.reservedSupply < 0) {
      fail(`player ${player.id} has invalid reserved supply ${player.reservedSupply}`)
    }
    if (!Number.isInteger(player.supplyCap) || player.supplyCap < 0 || player.supplyCap > MAX_SUPPLY_CAPACITY) {
      fail(`player ${player.id} has invalid supply cap ${player.supplyCap}`)
    }
    if (player.defeated && aliveOwners.has(player.id)) {
      fail(`defeated player ${player.id} still has living units`)
    }
  }
}

/**
 * Central-invariant step (master plan P1.08): validates that a tick preserved
 * the state's core properties. Runs last in the pipeline and never mutates
 * state; a violation means a system produced an illegal state.
 */
export function checkInvariants(state: GameState): void {
  // Only changed resources are validated each tick: definitions are validated
  // at construction and `harvest` is the single guarded writer, so a full
  // catalog scan would cost O(total resources) per tick for no added safety.
  for (const resource of state.resources.changed()) {
    if (!Number.isInteger(resource.remaining) || resource.remaining < 0) {
      fail(`resource ${resource.resourceId} has invalid amount ${resource.remaining}`)
    }
  }
  const reserved = new Map<number, number>()
  for (const id of state.world.aliveIds()) {
    checkEntity(state, id)
    checkProduction(state, id, reserved)
  }
  const footprints = state.world
    .query(Building)
    .map((id) => state.world.store(Building).get(id)?.footprint)
    .filter((footprint): footprint is NonNullable<typeof footprint> => footprint !== undefined)
  checkBuildingFootprints(state.mapBounds, footprints)
  checkPlayers(state)
  for (const player of state.players) {
    if (player.reservedSupply !== (reserved.get(player.id) ?? 0)) {
      fail(`player ${player.id} has mismatched reserved supply`)
    }
  }
  if (state.pendingDamage.size !== 0) {
    fail('the per-tick damage buffer was not cleared')
  }
}
