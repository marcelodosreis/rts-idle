import { GameSession } from '@rts/server'
import { createRulesIdentity, Health, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, worldWithCombatUnits } from '../fixtures/index.js'

function combatSession(seed: number) {
  const world = worldWithCombatUnits([0, 1])
  const ids = world.aliveIds()
  world.store(Position).set(ids[0]!, { x: 0, y: 0 })
  world.store(Position).set(ids[1]!, { x: 256, y: 0 })
  world.store(Health).set(ids[1]!, { current: 10, max: 100 })
  const session = GameSession.create({ seed, identity: createRulesIdentity('session-test'), initialWorld: world })
  return { session, ids }
}

describe('game session commands', () => {
  it('accepts an ATTACK command and projects the damage', () => {
    const { session, ids } = combatSession(SEEDS.integration.moveOwn)
    session.submit(0, [
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'ATTACK', payload: { unitIds: [ids[0]!], targetId: ids[1]! } }
      }
    ])
    const result = session.advance()

    // The one-hit target died: it is removed from the projection and the match
    // finished with player 0 as the only survivor.
    const projected = session.projectUnits()
    expect(projected.some((unit) => unit.id === ids[1])).toBe(false)
    expect(result.events).toEqual(
      expect.arrayContaining([{ type: 'damageDealt', targetId: ids[1], amount: 10, targetHp: 0 }])
    )
    expect(session.phase()).toBe('FINISHED')
  })

  it('exposes SURRENDER as a finished phase', () => {
    const { session } = combatSession(SEEDS.integration.moveOwn)
    session.submit(0, [{ tick: 1, playerId: 0, sequence: 1, intent: { type: 'SURRENDER', payload: {} } }])
    session.advance()
    expect(session.phase()).toBe('FINISHED')
    const playerZero = session.projectPlayers().find((player) => player.id === 0)
    expect(playerZero!.defeated).toBe(true)
  })

  it('stays RUNNING while both sides have living units', () => {
    const { session } = combatSession(SEEDS.integration.moveOwn)
    session.advance()
    expect(session.phase()).toBe('RUNNING')
  })
})
