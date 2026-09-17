import { createRng, START_ENTITY_ID } from '@rts/shared'
import type { SimulationOptions } from '../contracts/simulation.js'
import { createWorld } from '../ecs/create-world.js'
import type { World } from '../ecs/world.js'
import type { PlayerState } from '../state/players.js'
import { createDefaultPlayers } from '../state/players.js'
import type { GameState } from '../state/state.js'
import { Simulation } from './simulation.js'
import type { SimulationHost } from './simulation-host.js'

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

/** Applies per-slot overrides over the baseline player states (master plan §11.1). */
function resolvePlayers(overrides: readonly Partial<PlayerState>[] | undefined): PlayerState[] {
  const players = createDefaultPlayers()
  if (overrides === undefined) {
    return players
  }
  overrides.forEach((override, index) => {
    if (index < players.length) {
      players[index] = { ...players[index]!, ...override }
    }
  })
  return players
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
    players: resolvePlayers(options.players),
    world
  }
  return new Simulation(state)
}
