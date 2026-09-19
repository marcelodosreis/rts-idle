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
// state is caught by the test suite. Economy v0 intentionally changed this
// vector by appending its ECS components and bumping the simulation version.
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
    expect(sim.hashState()).toBe('1e36ea5efa4a555c286315c23aed794ecf6a0216b7d7d2ea2589135785471682')
  })

  it('produces the pinned serialized bytes for the characterization fixture', () => {
    const sim = buildGoldenSimulation()
    const snapshot = sim.exportSnapshot()
    expect(snapshot.tick).toBe(1)
    expect(snapshot.hash).toBe('1e36ea5efa4a555c286315c23aed794ecf6a0216b7d7d2ea2589135785471682')
    expect(Buffer.from(snapshot.bytes).toString('hex')).toBe(
      '000000010000000752554e4e494e4700000005302e352e3000000006676f6c64656e0000000b676f6c64656e2d686173680000000a676f6c64656e2d6d61700000000f676f6c64656e2d6d61702d68617368000679327a72cd7d8b3d99a6f5af4abc1ac00e77000000050000002000000020000000000000000400000000000001000000000002000000000003000000000000000004000000010100000000000001000100000000000000000000000000020100000100000001000101000000000000000000000000030100000200000001000100000000000000000000000000040100000300000001000101000000000000000000'
    )
  })
})
