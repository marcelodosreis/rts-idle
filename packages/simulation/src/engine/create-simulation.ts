import { createRng, type PlayerId, START_ENTITY_ID } from '@rts/shared'
import type { SimulationOptions } from '../contracts/simulation.js'
import { createWorld } from '../ecs/create-world.js'
import type { World } from '../ecs/world.js'
import type { GameState, PlayerState } from '../state/state.js'
import { Simulation } from './simulation.js'
import type { SimulationHost } from './simulation-host.js'

/** The four competitive player slots, initialized undefeated with an empty wallet. */
const PLAYER_SLOTS: readonly PlayerId[] = [0, 1, 2, 3]

function createPlayers(): PlayerState[] {
  return PLAYER_SLOTS.map((id) => ({ id, defeated: false, gold: 0 }))
}

const DEFAULT_MAP_BOUNDS = { width: 32, height: 32 } as const

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
  const world = options.initialWorld ?? createWorld()
  const state: GameState = {
    tick: 0,
    phase: 'RUNNING',
    identity: options.identity,
    seed: options.seed,
    rng,
    nextEntityId: resolveNextEntityId(world),
    players:
      options.initialPlayers === undefined ? createPlayers() : options.initialPlayers.map((player) => ({ ...player })),
    mapBounds: options.mapBounds ?? DEFAULT_MAP_BOUNDS,
    world,
    events: [],
    pendingDamage: new Map()
  }
  return new Simulation(state)
}
