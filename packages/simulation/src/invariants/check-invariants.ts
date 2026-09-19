import { GATHER_TICKS_PER_MINERAL, MINERAL_CARGO_CAPACITY } from '../data/economy-rules.js'
import { Base, Cargo, Combat, Health, Kind, MineralNode, Orders, Owner, Position } from '../ecs/components.js'
import { Construction } from '../ecs/construction-component.js'
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
    if (result.ok) {
      continue
    }
    throw new InvariantError(`check-invariants: building footprint ${index} is ${result.reason}`)
  }
}

function fail(invariant: string): never {
  throw new InvariantError(`check-invariants: ${invariant}`)
}

function checkConstruction(state: GameState, id: number): void {
  const kinds = state.world.store(Kind)
  const owners = state.world.store(Owner)
  const construction = state.world.store(Construction).get(id)
  if (construction === undefined) {
    return
  }
  if (owners.get(id) === undefined) {
    fail(`construction ${id} has no owner`)
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
  if (construction.status === 'COMPLETED' && !state.world.store(Base).has(id)) {
    fail(`completed construction ${id} is not a functional Base`)
  }
  if (construction.status !== 'COMPLETED' && state.world.store(Base).has(id)) {
    fail(`incomplete construction ${id} is a functional Base`)
  }
  if (construction.builderId !== null) {
    if (!state.world.hasEntity(construction.builderId) || kinds.get(construction.builderId) !== 'pawn') {
      fail(`construction ${id} references missing worker ${construction.builderId}`)
    }
  }
}

function checkEconomyEntity(state: GameState, id: number): void {
  const owners = state.world.store(Owner)
  const kinds = state.world.store(Kind)
  const node = state.world.store(MineralNode).get(id)
  if (node !== undefined && (!Number.isInteger(node.remaining) || node.remaining < 0)) {
    fail(`entity ${id} has negative mineral amount ${node.remaining}`)
  }
  if (state.world.store(Base).has(id) && owners.get(id) === undefined) {
    fail(`Base ${id} has no owner`)
  }
  checkConstruction(state, id)
  const cargo = state.world.store(Cargo).get(id)
  if (
    cargo !== undefined &&
    (!Number.isInteger(cargo.amount) ||
      cargo.amount < 0 ||
      cargo.amount > cargo.capacity ||
      cargo.capacity !== MINERAL_CARGO_CAPACITY)
  ) {
    fail(`entity ${id} has invalid cargo ${cargo.amount}/${cargo.capacity}`)
  }
  if (cargo !== undefined && (kinds.get(id) !== 'pawn' || owners.get(id) === undefined)) {
    fail(`entity ${id} has cargo without being an owned worker`)
  }
  const gatherOrder = state.world.store(Orders).get(id)?.queue[0]
  if (
    gatherOrder?.type === 'GATHER' &&
    (cargo === undefined || kinds.get(id) !== 'pawn' || owners.get(id) === undefined)
  ) {
    fail(`entity ${id} has gather order without Worker state`)
  }
  if (
    gatherOrder?.type === 'GATHER' &&
    (!Number.isInteger(gatherOrder.progressTicks) ||
      gatherOrder.progressTicks < 0 ||
      gatherOrder.progressTicks >= GATHER_TICKS_PER_MINERAL)
  ) {
    fail(`entity ${id} has invalid gather progress ${gatherOrder.progressTicks}`)
  }
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
  for (const id of state.world.aliveIds()) {
    const owner = owners.get(id)?.owner
    if (owner !== undefined) {
      aliveOwners.add(owner)
    }
  }
  for (const player of state.players) {
    if (!Number.isInteger(player.gold) || player.gold < 0) {
      fail(`player ${player.id} has invalid mineral balance ${player.gold}`)
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
  for (const id of state.world.aliveIds()) {
    checkEntity(state, id)
  }
  const footprints = state.world
    .aliveIds()
    .map((id) => state.world.store(Construction).get(id)?.footprint)
    .filter((footprint): footprint is NonNullable<typeof footprint> => footprint !== undefined)
  checkBuildingFootprints(state.mapBounds, footprints)
  checkPlayers(state)
  if (state.pendingDamage.size !== 0) {
    fail('the per-tick damage buffer was not cleared')
  }
}
