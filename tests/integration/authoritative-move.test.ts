import { GameSession } from '@rts/server'
import { allocateEntityId, START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import { createWorld, Owner, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../fixtures/index.js'

function sessionWithUnits(owners: readonly number[]) {
  const world = createWorld()
  let next = START_ENTITY_ID
  for (const owner of owners) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: 0, y: 0 })
    world.store(Owner).set(allocated.id, { owner })
  }
  return GameSession.create({ seed: SEEDS.integration.session, identity: TEST_IDENTITY, initialWorld: world })
}

function move(playerId: number, unitIds: readonly number[], x: number, y: number) {
  return { tick: 1, playerId, sequence: 1, intent: { type: 'MOVE' as const, payload: { unitIds, x, y } } }
}

describe('authoritative game session', () => {
  it('advances the authoritative state only through the session', () => {
    const session = sessionWithUnits([0])
    const target = tilesToFixed(5)

    session.submit(0, [move(0, [1], target, target)])
    const result = session.advance()

    expect(result.tick).toBe(1)
    expect(result.rejected).toHaveLength(0)
  })

  it('moves a unit for its owner and rejects a foreign-owner command', () => {
    const session = sessionWithUnits([0, 1])

    session.submit(0, [move(0, [1], tilesToFixed(4), tilesToFixed(4))])
    session.submit(1, [move(1, [1], tilesToFixed(9), tilesToFixed(9))])
    const result = session.advance()

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.code).toBe('NOT_OWNER')
  })

  it('prevents a player from submitting commands under another identity', () => {
    const session = sessionWithUnits([0, 1])
    expect(() => session.submit(0, [move(1, [2], 10, 10)])).toThrow()
  })

  it('produces deterministic authoritative results for identical inputs', () => {
    const a = sessionWithUnits([0])
    const b = sessionWithUnits([0])

    a.submit(0, [move(0, [1], tilesToFixed(3), tilesToFixed(3))])
    b.submit(0, [move(0, [1], tilesToFixed(3), tilesToFixed(3))])

    const ra = a.advance()
    const rb = b.advance()

    expect(rb.tick).toBe(ra.tick)
    expect(b.hashState()).toBe(a.hashState())
  })
})
