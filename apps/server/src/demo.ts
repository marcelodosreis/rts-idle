import { allocateEntityId, START_ENTITY_ID } from '@rts/shared'
import type { RulesIdentity } from '@rts/simulation'
import { createWorld, Owner, Position } from '@rts/simulation'
import { GameSession } from './sessions/session.js'

export const DEMO_IDENTITY: RulesIdentity = {
  simulationVersion: '0.1.0',
  rulesetVersion: 'demo',
  rulesetHash: 'demo',
  mapId: 'demo',
  mapHash: 'demo'
}

export function createDemoSession(): GameSession {
  const world = createWorld()
  let next = START_ENTITY_ID
  const spawns: readonly { readonly owner: number; readonly x: number; readonly y: number }[] = [
    { owner: 0, x: 2048, y: 2048 },
    { owner: 0, x: 2304, y: 2048 },
    { owner: 0, x: 2048, y: 2304 },
    { owner: 0, x: 2304, y: 2304 },
    { owner: 1, x: 46080, y: 2048 },
    { owner: 1, x: 46336, y: 2048 },
    { owner: 1, x: 46080, y: 2304 },
    { owner: 1, x: 46336, y: 2304 }
  ]
  for (const spawn of spawns) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: spawn.x, y: spawn.y })
    world.store(Owner).set(allocated.id, { owner: spawn.owner })
  }
  return GameSession.create({ seed: 123456, identity: DEMO_IDENTITY, initialWorld: world })
}
