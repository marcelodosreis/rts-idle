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
// state is caught by the test suite.
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
    expect(sim.hashState()).toBe('df5925e9772194b8a8d9f925955bdb46484775ec80821053e3e4fee9c7663b17')
  })

  it('produces the pinned serialized bytes for the characterization fixture', () => {
    const sim = buildGoldenSimulation()
    const snapshot = sim.exportSnapshot()
    expect(snapshot.tick).toBe(1)
    expect(snapshot.hash).toBe('df5925e9772194b8a8d9f925955bdb46484775ec80821053e3e4fee9c7663b17')
    expect(Buffer.from(snapshot.bytes).toString('hex')).toBe(
      '000000010000000752554e4e494e4700000005302e322e3000000006676f6c64656e0000000b676f6c64656e2d686173680000000a676f6c64656e2d6d61700000000f676f6c64656e2d6d61702d68617368000679327a72cd7d8b3d99a6f5af4abc1ac00e770000000500000004000001900000000000000000000000000000000001900000000000000000000000000000000001900000000000000000000000000000000001900000000000000000000000000000000000040000000101000000000000010001000000000000020100000100000001000101000000000003010000020000000100010000000000000401000003000000010001010000'
    )
  })
})
