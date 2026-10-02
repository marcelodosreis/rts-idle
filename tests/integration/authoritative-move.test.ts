import { GameSession } from '@rts/server'
import { type PlayerId, tilesToFixed } from '@rts/shared'
import { describe, expect, it } from 'vitest'
import { buildMoveCommand, SEEDS, TEST_IDENTITY, worldWithOwners } from '../fixtures/index.js'

function sessionWithUnits(owners: readonly PlayerId[]): GameSession {
  return GameSession.create({
    seed: SEEDS.integration.session,
    identity: TEST_IDENTITY,
    initialWorld: worldWithOwners(owners)
  })
}

describe('authoritative game session', () => {
  it('advances the authoritative state only through the session', () => {
    const session = sessionWithUnits([0])
    const target = tilesToFixed(5)

    session.submit(0, [buildMoveCommand([1], target, target)])
    const result = session.advance()

    expect(result.tick).toBe(1)
    expect(result.rejected).toHaveLength(0)
  })

  it('moves a unit for its owner and rejects a foreign-owner command', () => {
    const session = sessionWithUnits([0, 1])

    session.submit(0, [buildMoveCommand([1], tilesToFixed(4), tilesToFixed(4))])
    session.submit(1, [buildMoveCommand([1], tilesToFixed(9), tilesToFixed(9), { playerId: 1 })])
    const result = session.advance()

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.code).toBe('NOT_OWNER')
  })

  it('prevents a player from submitting commands under another identity', () => {
    const session = sessionWithUnits([0, 1])
    expect(() => session.submit(0, [buildMoveCommand([2], 10, 10, { playerId: 1 })])).toThrow()
  })

  it('produces deterministic authoritative results for identical inputs', () => {
    const a = sessionWithUnits([0])
    const b = sessionWithUnits([0])

    a.submit(0, [buildMoveCommand([1], tilesToFixed(3), tilesToFixed(3))])
    b.submit(0, [buildMoveCommand([1], tilesToFixed(3), tilesToFixed(3))])

    const ra = a.advance()
    const rb = b.advance()

    expect(rb.tick).toBe(ra.tick)
    expect(b.hashState()).toBe(a.hashState())
  })
})
