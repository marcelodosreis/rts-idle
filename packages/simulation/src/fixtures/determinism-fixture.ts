import { allocateEntityId, FIXED_SCALE, gridPosition, type PlayerId, START_ENTITY_ID } from '@rts/shared'
import { createRulesIdentity } from '../contracts/rules-identity.js'
import type { RulesIdentity } from '../contracts/simulation.js'
import { Owner, Position } from '../ecs/components.js'
import { createWorld } from '../ecs/create-world.js'
import type { World } from '../ecs/world.js'
import { createSimulation } from '../engine/create-simulation.js'

export const FIXTURE_IDENTITY: RulesIdentity = createRulesIdentity('fixture')

/** Fixture units are laid out on a 32-column tile grid. */
const GRID_COLUMNS = 32

/** At most this many units per owner move each tick, keeping the fixture small but non-trivial. */
const MAX_FIXTURE_MOVE_UNITS = 16

export function buildFixtureWorld(unitCount: number): World {
  const world = createWorld()
  let next = START_ENTITY_ID
  for (let i = 0; i < unitCount; i += 1) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, gridPosition(i, GRID_COLUMNS, FIXED_SCALE))
    world.store(Owner).set(allocated.id, { owner: i % 2 === 0 ? 0 : 1 })
  }
  return world
}

export function runDeterminismFixture(seed: number, ticks: number, unitCount = 64): string[] {
  const world = buildFixtureWorld(unitCount)
  const sim = createSimulation({ seed, identity: FIXTURE_IDENTITY, initialWorld: world })
  const owners = world.store(Owner)
  const idsByOwner = new Map<PlayerId, number[]>()
  for (const id of world.aliveIds()) {
    const owner = owners.get(id)?.owner ?? 0
    const list = idsByOwner.get(owner)
    if (list === undefined) {
      idsByOwner.set(owner, [id])
    } else {
      list.push(id)
    }
  }

  const hashes: string[] = []
  for (let t = 1; t <= ticks; t += 1) {
    // Deterministic pseudo-random targets derived from the tick, without
    // consuming the simulation RNG stream: two coprime multipliers keep the
    // targets varied across ticks.
    const x = (t * 977) % 50000
    const y = (t * 211) % 50000
    const commands = []
    for (const [playerId, ids] of idsByOwner) {
      const moveIds = ids.slice(0, MAX_FIXTURE_MOVE_UNITS)
      if (moveIds.length > 0) {
        commands.push({
          tick: t,
          playerId,
          sequence: t,
          intent: { type: 'MOVE' as const, payload: { unitIds: moveIds, x, y } }
        })
      }
    }
    sim.step(commands)
    hashes.push(sim.hashState())
  }
  return hashes
}
