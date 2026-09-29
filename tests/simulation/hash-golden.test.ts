import { allocateEntityId, START_ENTITY_ID } from '@rts/shared'
import {
  createRulesIdentity,
  createSimulation,
  createWorld,
  Owner,
  Position,
  type RulesIdentity
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'

const GOLDEN_IDENTITY: RulesIdentity = createRulesIdentity('golden', {
  rulesetHash: 'golden-hash',
  mapId: 'golden-map',
  mapHash: 'golden-map-hash'
})

const GOLDEN_SEED = 424242

// Characterization fixture: 4 units, seed 424242, one MOVE-less tick.
// Pins the canonical serialization format (ADR-002/011) and the SHA-256
// state hash so any accidental drift in ordering, encoding, or the RNG
// state is caught by the test suite. Economy v0 and P2.11 intentionally changed
// this vector by appending their ECS components and bumping the simulation version.
function buildGoldenSimulation() {
  const world = createWorld()
  let next = START_ENTITY_ID
  for (let i = 0; i < 4; i += 1) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: i * 256, y: 256 })
    world.store(Owner).set(allocated.id, { owner: i % 2 })
  }
  const sim = createSimulation({ seed: GOLDEN_SEED, identity: GOLDEN_IDENTITY, initialWorld: world })
  sim.step()
  return sim
}

describe('canonical state hash golden', () => {
  it('produces the pinned hash for the characterization fixture', () => {
    const sim = buildGoldenSimulation()
    expect(sim.hashState()).toBe('f7d8437ed7ccbf3c0a46820b0557b785bcb3e286020bdc04564f33516c33f822')
  })

  it('produces the pinned serialized bytes for the characterization fixture', () => {
    const sim = buildGoldenSimulation()
    const snapshot = sim.exportSnapshot()
    expect(snapshot.tick).toBe(1)
    expect(snapshot.hash).toBe('f7d8437ed7ccbf3c0a46820b0557b785bcb3e286020bdc04564f33516c33f822')
    expect(snapshot.bytes.byteLength).toBe(319)
  })
})
