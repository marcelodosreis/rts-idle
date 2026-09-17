import { allocateEntityId, START_ENTITY_ID } from '@rts/shared'
import type { RulesIdentity } from './contracts/simulation.js'
import { Owner, Position } from './ecs/components.js'
import { createWorld, type World } from './ecs/world.js'
import { createSimulation } from './engine.js'

export const FIXTURE_IDENTITY: RulesIdentity = {
  simulationVersion: '0.1.0',
  rulesetVersion: 'fixture',
  rulesetHash: 'fixture',
  mapId: 'fixture',
  mapHash: 'fixture'
}

export function buildFixtureWorld(unitCount: number): World {
  const world = createWorld()
  let next = START_ENTITY_ID
  for (let i = 0; i < unitCount; i += 1) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: (i % 32) * 256, y: Math.floor(i / 32) * 256 })
    world.store(Owner).set(allocated.id, { owner: i % 2 })
  }
  return world
}

export function runDeterminismFixture(seed: number, ticks: number, unitCount = 64): string[] {
  const world = buildFixtureWorld(unitCount)
  const sim = createSimulation({ seed, identity: FIXTURE_IDENTITY, initialWorld: world })
  const owners = world.store(Owner)
  const idsByOwner = new Map<number, number[]>()
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
    const x = (t * 977) % 50000
    const y = (t * 211) % 50000
    const commands = []
    for (const [playerId, ids] of idsByOwner) {
      const moveIds = ids.slice(0, 16)
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
