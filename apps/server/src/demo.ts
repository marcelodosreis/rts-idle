import { allocateEntityId, type Fixed, type PlayerId, START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import { createRulesIdentity, createWorld, Owner, Position, type RulesIdentity } from '@rts/simulation'
import { GameSession } from './sessions/session.js'

export const DEMO_IDENTITY: RulesIdentity = createRulesIdentity('demo')

interface DemoSpawn {
  readonly owner: PlayerId
  readonly x: Fixed
  readonly y: Fixed
}

// Spawn positions authored in tiles and converted to fixed units. The demo map
// is 192 tiles wide; player 1 starts in the far-right corner, mirrored.
const DEMO_SPAWNS: readonly DemoSpawn[] = [
  { owner: 0, x: tilesToFixed(8), y: tilesToFixed(8) },
  { owner: 0, x: tilesToFixed(9), y: tilesToFixed(8) },
  { owner: 0, x: tilesToFixed(8), y: tilesToFixed(9) },
  { owner: 0, x: tilesToFixed(9), y: tilesToFixed(9) },
  { owner: 1, x: tilesToFixed(180), y: tilesToFixed(8) },
  { owner: 1, x: tilesToFixed(181), y: tilesToFixed(8) },
  { owner: 1, x: tilesToFixed(180), y: tilesToFixed(9) },
  { owner: 1, x: tilesToFixed(181), y: tilesToFixed(9) }
]

export function createDemoSession(): GameSession {
  const world = createWorld()
  let next = START_ENTITY_ID
  for (const spawn of DEMO_SPAWNS) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: spawn.x, y: spawn.y })
    world.store(Owner).set(allocated.id, { owner: spawn.owner })
  }
  return GameSession.create({ seed: 123456, identity: DEMO_IDENTITY, initialWorld: world })
}
