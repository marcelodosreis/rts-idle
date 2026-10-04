import { CanonicalReader } from '../canonical/reader.js'
import { CanonicalWriter } from '../canonical/writer.js'
import type { ComponentType } from '../ecs/components.js'
import { World } from '../ecs/world.js'
import { decodeScheduledCommand, encodeScheduledCommand } from '../snapshot/commands.js'
import type { GameState, PlayerState } from './state.js'

/**
 * Rebuilds one component value through its canonical codec, so an observation
 * copy normalizes absent/optional fields exactly like `deserializeState`
 * (for example `tierUpgrade: undefined` becomes `null`). Codecs are pure and
 * return fresh objects, which also guarantees copy independence.
 */
function normalizeComponent<T>(type: ComponentType<T>, value: T): T {
  const writer = new CanonicalWriter()
  type.encode(writer, value)
  return type.decode(new CanonicalReader(writer.toBytes()))
}

/** Independent ECS copy for simulation ownership and external observations. */
export function cloneWorld(world: World): World {
  const copy = new World({}, world.changeHistoryCapacity())
  for (const type of world.componentTypes()) {
    copy.registerComponent(type)
  }
  for (const id of world.aliveIds()) {
    copy.createEntity(id)
    for (const type of world.componentTypes()) {
      const value = world.store(type).get(id)
      if (value !== undefined) {
        copy.store(type).set(id, normalizeComponent(type, value))
      }
    }
  }
  return copy
}

function clonePlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    resources: { ...player.resources },
    completedResearch: [...player.completedResearch]
  }
}

function cloneCommand(command: GameState['pendingCommands'][number]): GameState['pendingCommands'][number] {
  const writer = new CanonicalWriter()
  encodeScheduledCommand(writer, command)
  return decodeScheduledCommand(new CanonicalReader(writer.toBytes()))
}

/**
 * Independent observation copy of the state. Mirrors `deserializeState` for
 * every persisted field (fresh world, players, bounds, resource amounts) and
 * resets the transient per-tick fields, but shares the immutable
 * `RulesIdentity` and `ResourceCatalog` and never serializes the full resource
 * catalog — so observations stay cheap with tens of thousands of resources.
 */
export function cloneGameState(state: GameState): GameState {
  const bounds = state.mapBounds
  return {
    tick: state.tick,
    phase: state.phase,
    identity: state.identity,
    seed: state.seed,
    rng: { ...state.rng },
    nextEntityId: state.nextEntityId,
    players: state.players.map((player) => clonePlayer(player)),
    mapBounds:
      bounds.invalidTiles === undefined
        ? { width: bounds.width, height: bounds.height }
        : {
            width: bounds.width,
            height: bounds.height,
            invalidTiles: bounds.invalidTiles.map((tile) => ({ x: tile.x, y: tile.y }))
          },
    resources: state.resources.clone(),
    world: cloneWorld(state.world),
    pendingCommands: state.pendingCommands.map(cloneCommand),
    events: [],
    pendingDamage: new Map()
  }
}
