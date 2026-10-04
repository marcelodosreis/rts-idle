import {
  createPlayerResources,
  createRng,
  FIXED_SCALE,
  PLAYER_IDS,
  type ResearchType,
  START_ENTITY_ID
} from '@rts/shared'
import type { SimulationOptions } from '../contracts/simulation.js'
import { createWorld } from '../ecs/create-world.js'
import type { World } from '../ecs/world.js'
import { createNavigationState } from '../navigation/navigation-state.js'
import { createResourceState } from '../resources/resource-state.js'
import { cloneWorld } from '../state/clone-state.js'
import type { GameState, PlayerState } from '../state/state.js'
import { updateSupply } from '../systems/supply-system.js'
import { Simulation } from './simulation.js'
import type { SimulationHost } from './simulation-host.js'

/** The four competitive player slots, initialized undefeated with an empty wallet. */
function createPlayers(): PlayerState[] {
  return PLAYER_IDS.map((id) => ({
    id,
    defeated: false,
    resources: createPlayerResources(),
    usedSupply: 0,
    reservedSupply: 0,
    supplyCap: 0,
    completedResearch: [] as readonly ResearchType[]
  }))
}

const DEFAULT_MAP_BOUNDS = { width: 32, height: 32 } as const

function clonePlayers(players: NonNullable<SimulationOptions['initialPlayers']>): PlayerState[] {
  return players.map((player) => ({
    ...player,
    resources: { ...player.resources },
    usedSupply: player.usedSupply ?? 0,
    reservedSupply: player.reservedSupply ?? 0,
    supplyCap: player.supplyCap ?? 0,
    completedResearch: [...(player.completedResearch ?? [])]
  }))
}

function cloneMapBounds(
  bounds: NonNullable<SimulationOptions['mapBounds']>
): NonNullable<SimulationOptions['mapBounds']> {
  return bounds.invalidTiles === undefined
    ? { width: bounds.width, height: bounds.height }
    : { width: bounds.width, height: bounds.height, invalidTiles: bounds.invalidTiles.map((tile) => ({ ...tile })) }
}

/**
 * Resolves the next free entity id from an initial world.
 *
 * The world is expected to hold ids allocated monotonically from
 * START_ENTITY_ID (the spawn fixtures' convention); the next id is simply the
 * largest alive id plus one. Changing this contract changes id allocation and
 * therefore the canonical stream, so it is pinned by the determinism tests.
 */
function resolveNextEntityId(world: World): number {
  const lastId = world.aliveIds().at(-1)
  return lastId === undefined ? START_ENTITY_ID : lastId + 1
}

export function createSimulation(options: SimulationOptions): SimulationHost {
  const rng = createRng(options.seed)
  const world = options.initialWorld === undefined ? createWorld() : cloneWorld(options.initialWorld)
  const mapBounds = options.mapBounds === undefined ? { ...DEFAULT_MAP_BOUNDS } : cloneMapBounds(options.mapBounds)
  const resourceTiles = (options.resources ?? [])
    .filter((resource) => !resource.blocksNavigation)
    .map((resource) => ({ x: Math.floor(resource.x / FIXED_SCALE), y: Math.floor(resource.y / FIXED_SCALE) }))
  const navigation = {
    ...(options.navigation ?? {}),
    excludedTiles: [...(options.navigation?.excludedTiles ?? []), ...resourceTiles]
  }
  const state: GameState = {
    tick: 0,
    phase: 'RUNNING',
    identity: options.identity,
    seed: options.seed,
    rng,
    nextEntityId: resolveNextEntityId(world),
    players: options.initialPlayers === undefined ? createPlayers() : clonePlayers(options.initialPlayers),
    mapBounds,
    resources: createResourceState(options.resources),
    navigation: createNavigationState(mapBounds, navigation),
    world,
    pendingCommands: [],
    events: [],
    pendingDamage: new Map()
  }
  updateSupply(state)
  return new Simulation(state)
}
