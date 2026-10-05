import { PROTOCOL_VERSION } from '@rts/protocol'
import { GameSession } from '@rts/server'
import { type CommandIntent, tilesToFixed } from '@rts/shared'
import type { ScheduledCommand, SimulationObservation } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { createAuthoritativeMatch } from '../../apps/server/src/bootstrap/match-bootstrap.js'

const MONASTERY_TILE = { x: 11, y: 10 }
const MONASTERY_TARGET = { x: tilesToFixed(MONASTERY_TILE.x), y: tilesToFixed(MONASTERY_TILE.y) }

function createRegressionSession(): GameSession {
  return createAuthoritativeMatch({
    type: 'match_request',
    protocolVersion: PROTOCOL_VERSION,
    scenarioId: 'regression',
    aggression: 'passive',
    map: { source: 'catalog' }
  }).session
}

function issue(session: GameSession, intent: CommandIntent, sequence: number): void {
  const command: ScheduledCommand = {
    tick: session.tick() + 1,
    playerId: 0,
    sequence,
    intent
  }
  session.submit(0, [command])
  expect(session.advance().rejected).toEqual([])
}

function advanceUntil(
  session: GameSession,
  predicate: (observation: SimulationObservation) => boolean,
  limit: number
): void {
  for (let tick = 0; tick < limit; tick += 1) {
    session.advance()
    if (predicate(session.observe(true))) {
      return
    }
  }
  throw new Error(`economy chain did not reach its state within ${limit} ticks`)
}

function playerWorker(observation: SimulationObservation) {
  return observation.units.find((unit) => unit.owner === 0 && unit.canGather)
}

function playerCastle(observation: SimulationObservation) {
  return observation.buildings.find((building) => building.owner === 0 && building.buildingType === 'CASTLE')
}

function monastery(observation: SimulationObservation) {
  return observation.buildings.find(
    (building) =>
      building.owner === 0 &&
      building.buildingType === 'MONASTERY' &&
      building.x === MONASTERY_TARGET.x &&
      building.y === MONASTERY_TARGET.y
  )
}

function runComposedChain(session: GameSession): void {
  const initial = session.observe(true)
  const worker = playerWorker(initial)
  const castle = playerCastle(initial)
  const resource = initial.resources.at(-1)
  if (worker === undefined || castle === undefined || resource === undefined) {
    throw new Error('regression session is missing the economy chain inputs')
  }
  const initialGold = initial.players[0]!.resources.GOLD

  issue(session, { type: 'GATHER', payload: { unitIds: [worker.id], resourceId: resource.resourceId } }, 1)
  advanceUntil(
    session,
    (observation) => observation.units.find((unit) => unit.id === worker.id)?.economy?.phase === 'to_base',
    1_000
  )
  issue(session, { type: 'STOP', payload: { unitIds: [worker.id] } }, 2)
  issue(session, { type: 'DEPOSIT', payload: { unitIds: [worker.id], buildingId: castle.id } }, 3)
  advanceUntil(session, (observation) => observation.players[0]!.resources.GOLD > initialGold, 1_000)

  issue(session, { type: 'UPGRADE_CASTLE', payload: { castleId: castle.id } }, 4)
  advanceUntil(
    session,
    (observation) => {
      const currentCastle = playerCastle(observation)
      return currentCastle?.tier === 2 && currentCastle.tierUpgrade === null
    },
    200
  )

  issue(
    session,
    {
      type: 'BUILD',
      payload: { unitId: worker.id, buildingType: 'MONASTERY', ...MONASTERY_TILE }
    },
    5
  )
  advanceUntil(session, (observation) => monastery(observation)?.status === 'COMPLETED', 500)
  const completedMonastery = monastery(session.observe(true))
  if (completedMonastery === undefined) {
    throw new Error('completed Monastery is missing from the regression observation')
  }

  issue(session, { type: 'TRAIN', payload: { producerId: completedMonastery.id, unitKind: 'monk' } }, 6)
  issue(session, { type: 'RESEARCH', payload: { monasteryId: completedMonastery.id, researchType: 'ECONOMY' } }, 7)
  const queued = session.observe(true).buildings.find((building) => building.id === completedMonastery.id)
    ?.production?.queue
  expect(queued?.map((item) => item.status)).toEqual(['ACTIVE', 'QUEUED'])
}

describe('economic integration chain (P2.12)', () => {
  it('moves the first regression worker out of its starting group to build a House', () => {
    const session = createRegressionSession()
    const worker = playerWorker(session.observe(true))
    const target = { x: 10, y: 10 }
    if (worker === undefined) {
      throw new Error('regression session is missing a player worker')
    }

    issue(session, { type: 'BUILD', payload: { unitId: worker.id, buildingType: 'HOUSE', ...target } }, 1)
    advanceUntil(
      session,
      (observation) =>
        observation.buildings.some(
          (building) =>
            building.owner === 0 &&
            building.buildingType === 'HOUSE' &&
            building.x === tilesToFixed(target.x) &&
            building.y === tilesToFixed(target.y) &&
            building.status === 'COMPLETED'
        ),
      500
    )
  })

  it('lets a replacement regression worker resume a paused House construction', () => {
    const session = createRegressionSession()
    const workers = session.observe(true).units.filter((unit) => unit.owner === 0 && unit.canGather)
    const firstWorker = workers[0]
    const replacementWorker = workers[1]
    const target = { x: 10, y: 10 }
    if (firstWorker === undefined || replacementWorker === undefined) {
      throw new Error('regression session is missing the replacement workers')
    }

    issue(session, { type: 'BUILD', payload: { unitId: firstWorker.id, buildingType: 'HOUSE', ...target } }, 1)
    issue(session, { type: 'STOP', payload: { unitIds: [firstWorker.id] } }, 2)
    issue(session, { type: 'BUILD', payload: { unitId: replacementWorker.id, buildingType: 'HOUSE', ...target } }, 3)
    advanceUntil(
      session,
      (observation) =>
        observation.buildings.some(
          (building) =>
            building.owner === 0 &&
            building.buildingType === 'HOUSE' &&
            building.x === tilesToFixed(target.x) &&
            building.y === tilesToFixed(target.y) &&
            building.status === 'COMPLETED'
        ),
      500
    )
  })

  it('lets a replacement regression worker complete a Castle beside its starting group', () => {
    const session = createRegressionSession()
    const workers = session.observe(true).units.filter((unit) => unit.owner === 0 && unit.canGather)
    const firstWorker = workers[0]
    const replacementWorker = workers[1]
    const target = { x: 10, y: 10 }
    if (firstWorker === undefined || replacementWorker === undefined) {
      throw new Error('regression session is missing the replacement workers')
    }

    issue(session, { type: 'BUILD', payload: { unitId: firstWorker.id, buildingType: 'CASTLE', ...target } }, 1)
    advanceUntil(
      session,
      (observation) => {
        const position = observation.units.find((unit) => unit.id === firstWorker.id)
        return (
          position !== undefined &&
          Math.abs(position.x - tilesToFixed(target.x)) <= 128 &&
          Math.abs(position.y - tilesToFixed(target.y + 2)) <= 128
        )
      },
      500
    )
    issue(session, { type: 'STOP', payload: { unitIds: [firstWorker.id] } }, 2)
    issue(session, { type: 'BUILD', payload: { unitId: replacementWorker.id, buildingType: 'CASTLE', ...target } }, 3)
    advanceUntil(
      session,
      (observation) =>
        observation.buildings.some(
          (building) =>
            building.owner === 0 &&
            building.buildingType === 'CASTLE' &&
            building.x === tilesToFixed(target.x) &&
            building.y === tilesToFixed(target.y) &&
            building.status === 'COMPLETED'
        ),
      500
    )
  })

  it('replays gather through production and research with identical snapshot hashes', () => {
    const first = createRegressionSession()
    const second = createRegressionSession()
    runComposedChain(first)
    runComposedChain(second)
    expect(second.hashState()).toBe(first.hashState())

    const restored = GameSession.fromSnapshot(first.snapshot())
    expect(restored.hashState()).toBe(first.hashState())
    for (let tick = 0; tick < 1_100; tick += 1) {
      first.advance()
      second.advance()
      restored.advance()
      expect(second.hashState()).toBe(first.hashState())
      expect(restored.hashState()).toBe(first.hashState())
    }

    const final = first.observe(true)
    expect(final.players[0]?.completedResearch).toContain('ECONOMY')
    expect(final.players[0]?.resources.GOLD).toBe(60)
  }, 30_000)
})
