import { PROTOCOL_VERSION } from '@rts/protocol'
import type { GameSession } from '@rts/server'
import type { CommandIntent, PlayerId } from '@rts/shared'
import type { ScheduledCommand } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { createAuthoritativeMatch } from '../../apps/server/src/bootstrap/match-bootstrap.js'

function createRegressionSession(): GameSession {
  return createAuthoritativeMatch({
    type: 'match_request',
    protocolVersion: PROTOCOL_VERSION,
    scenarioId: 'regression',
    aggression: 'passive',
    map: { source: 'catalog' }
  }).session
}

function gatherCommand(session: GameSession, playerId: PlayerId, sequence: number): ScheduledCommand {
  const observation = session.observe(true)
  const worker = observation.units.find((unit) => unit.owner === playerId && unit.canGather)
  const resource = observation.resources.at(-1)
  if (worker === undefined || resource === undefined) {
    throw new Error('regression session is missing an isolation test gather input')
  }
  const intent: CommandIntent = { type: 'GATHER', payload: { unitIds: [worker.id], resourceId: resource.resourceId } }
  return {
    tick: session.tick() + 1,
    playerId,
    sequence,
    intent
  }
}

describe('game session isolation', () => {
  it('keeps interleaved sessions independent and deterministic', () => {
    const first = createRegressionSession()
    const second = createRegressionSession()
    const initialSecondHash = second.hashState()

    first.submit(0, [gatherCommand(first, 0, 1)])
    expect(first.advance().rejected).toEqual([])

    expect(second.hashState()).toBe(initialSecondHash)
    expect(second.observe(true).units.find((unit) => unit.owner === 0 && unit.canGather)?.economy).toBeUndefined()

    second.submit(0, [gatherCommand(second, 0, 1)])
    expect(second.advance().rejected).toEqual([])
    expect(second.hashState()).toBe(first.hashState())
  })
})
