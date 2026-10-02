import { PROTOCOL_VERSION } from '@rts/protocol'
import { GameSession } from '@rts/server'
import { tilesToFixed } from '@rts/shared'
import {
  Building,
  Cargo,
  createRulesIdentity,
  createWorld,
  Health,
  Kind,
  Owner,
  Position,
  Production
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { bootstrapMatch, createAuthoritativeMatch } from '../../apps/server/src/bootstrap/match-bootstrap.js'
import { DEMO_SCENARIOS } from '../../apps/server/src/content/demo/scenarios.js'
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

function units(session: GameSession) {
  return session.observe(true).units
}

function buildings(session: GameSession) {
  return session.observe(true).buildings
}

function players(session: GameSession) {
  return session.observe(true).players
}

function resources(session: GameSession, complete: boolean) {
  return session.observe(complete).resources
}

describe('game session commands', () => {
  it('returns the server scenario catalog when a local map fails bootstrap', () => {
    const result = bootstrapMatch({
      type: 'match_request',
      protocolVersion: PROTOCOL_VERSION,
      scenarioId: '8v8',
      aggression: 'offensive',
      map: { source: 'local', definition: { width: 1, height: 1, tiles: ['land'], resources: [] } }
    })

    expect(result).toEqual({
      error: {
        type: 'error',
        message: 'scenario spawn is outside or on invalid terrain',
        scenarios: DEMO_SCENARIOS.map(({ id, label }) => ({ id, label }))
      }
    })
  })

  it('seeds the economy sandbox with five workers, five enemy pawns, two Castles, 250 gold, and one resource', () => {
    const session = createAuthoritativeMatch({
      type: 'match_request',
      protocolVersion: PROTOCOL_VERSION,
      scenarioId: 'default',
      aggression: 'passive',
      map: { source: 'catalog' }
    }).session

    expect(units(session)).toHaveLength(10)
    expect(units(session).map(({ x, y }) => ({ x, y }))).toEqual([
      { x: tilesToFixed(7), y: tilesToFixed(11) },
      { x: tilesToFixed(8), y: tilesToFixed(11) },
      { x: tilesToFixed(9), y: tilesToFixed(11) },
      { x: tilesToFixed(10), y: tilesToFixed(11) },
      { x: tilesToFixed(11), y: tilesToFixed(11) },
      { x: tilesToFixed(22), y: tilesToFixed(27) },
      { x: tilesToFixed(23), y: tilesToFixed(27) },
      { x: tilesToFixed(24), y: tilesToFixed(27) },
      { x: tilesToFixed(25), y: tilesToFixed(27) },
      { x: tilesToFixed(26), y: tilesToFixed(27) }
    ])
    expect(units(session)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: 0, kind: 'pawn' }),
        expect.objectContaining({ owner: 0, kind: 'pawn' }),
        expect.objectContaining({ owner: 0, kind: 'pawn' }),
        expect.objectContaining({ owner: 0, kind: 'pawn' }),
        expect.objectContaining({ owner: 0, kind: 'pawn' }),
        expect.objectContaining({ owner: 1, kind: 'pawn' }),
        expect.objectContaining({ owner: 1, kind: 'pawn' }),
        expect.objectContaining({ owner: 1, kind: 'pawn' }),
        expect.objectContaining({ owner: 1, kind: 'pawn' }),
        expect.objectContaining({ owner: 1, kind: 'pawn' })
      ])
    )
    expect(players(session).find((player) => player.id === 0)?.resources.GOLD).toBe(250)
    expect(buildings(session)).toHaveLength(2)
    expect(buildings(session)).toEqual(
      expect.arrayContaining([expect.objectContaining({ buildingType: 'CASTLE', owner: 0 })])
    )
    expect(resources(session, true)).toEqual(expect.arrayContaining([expect.objectContaining({ remaining: 3000 })]))
    const worker = units(session)[0]!
    const node = resources(session, true).find((resource) => resource.remaining === 3000)!
    session.submit(0, [
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'GATHER', payload: { unitIds: [worker.id], resourceId: node.resourceId } }
      }
    ])
    expect(session.advance().rejected).toEqual([])
    expect(units(session)[0]!.x).not.toBe(worker.x)
    expect(units(session)[0]!.economy).toEqual(
      expect.objectContaining({
        phase: 'to_resource',
        cargoAmount: 0,
        cargoCapacity: 10,
        progressMax: 200,
        resourceId: node.resourceId
      })
    )
    for (let tick = 0; tick < 100 && units(session)[0]!.economy?.phase !== 'harvesting'; tick += 1) {
      session.advance()
    }
    expect(units(session)[0]!.economy).toEqual(expect.objectContaining({ phase: 'harvesting' }))
    expect(session.phase()).toBe('RUNNING')
  })

  it('keeps the normal simulation wallet at zero outside a configured demo scenario', () => {
    const session = GameSession.create({
      seed: SEEDS.integration.session,
      identity: createRulesIdentity('session-test')
    })

    expect(players(session).find((player) => player.id === 0)?.resources.GOLD).toBe(0)
  })

  it('projects an empty resource delta while idle and every amount on reconnect', () => {
    const session = createAuthoritativeMatch({
      type: 'match_request',
      protocolVersion: PROTOCOL_VERSION,
      scenarioId: 'default',
      aggression: 'passive',
      map: { source: 'catalog' }
    }).session

    expect(resources(session, false)).toEqual([])
    session.advance()
    expect(resources(session, false)).toEqual([])
    const complete = resources(session, true)
    expect(complete).toHaveLength(41)
    expect(complete.every((resource) => resource.remaining > 0)).toBe(true)
  })

  it('projects a builder as moving, then building at its work point', () => {
    const session = createAuthoritativeMatch({
      type: 'match_request',
      protocolVersion: PROTOCOL_VERSION,
      scenarioId: 'default',
      aggression: 'passive',
      map: { source: 'catalog' }
    }).session
    const worker = units(session)[0]!

    session.submit(0, [
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'BUILD', payload: { unitId: worker.id, buildingType: 'CASTLE', x: 11, y: 9 } }
      }
    ])
    expect(session.advance().rejected).toEqual([])
    expect(units(session).find((unit) => unit.id === worker.id)?.orderState).toBe('moving')

    for (let tick = 0; tick < 100; tick += 1) {
      session.advance()
      if (units(session).find((unit) => unit.id === worker.id)?.orderState === 'building') {
        break
      }
    }
    expect(units(session).find((unit) => unit.id === worker.id)?.orderState).toBe('building')
  })

  it('projects units, Castles, and resources as distinct observations', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Position).set(1, { x: 0, y: 0 })
    world.store(Owner).set(1, { owner: 0 })
    world.store(Kind).set(1, 'pawn')
    world.createEntity(2)
    world.store(Position).set(2, { x: 256, y: 0 })
    world.store(Owner).set(2, { owner: 0 })
    world.store(Building).set(2, {
      buildingType: 'CASTLE',
      status: 'COMPLETED',
      progressTicks: 1,
      totalTicks: 1,
      builderId: null,
      footprint: { x: 1, y: 0, width: 2, height: 2 }
    })
    const session = GameSession.create({
      seed: SEEDS.integration.session,
      identity: createRulesIdentity('session-test'),
      initialWorld: world,
      resources: [
        {
          resourceId: 3,
          kind: 'GOLD_MINE',
          x: 512,
          y: 0,
          variant: 0,
          initialAmount: 25,
          harvestAmount: 10,
          harvestTicks: 200,
          blocksNavigation: false
        }
      ]
    })

    expect(units(session)).toEqual([expect.objectContaining({ id: 1, x: 0, y: 0, owner: 0, kind: 'pawn' })])
    expect(buildings(session)).toEqual([
      expect.objectContaining({ id: 2, x: 256, y: 0, owner: 0, buildingType: 'CASTLE' })
    ])
    expect(resources(session, true)).toEqual([{ resourceId: 3, remaining: 25 }])
  })

  it('keeps observations independent from authoritative session state', () => {
    const session = createAuthoritativeMatch({
      type: 'match_request',
      protocolVersion: PROTOCOL_VERSION,
      scenarioId: 'default',
      aggression: 'passive',
      map: { source: 'catalog' }
    }).session
    const observation = session.observe(true)
    const unit = observation.units[0]!
    const player = observation.players[0]!
    Object.assign(unit, { x: 999_999 })
    Object.assign(player.resources, { GOLD: 999_999 })

    expect(session.observe(true).units.find(({ id }) => id === unit.id)?.x).not.toBe(999_999)
    expect(session.observe(true).players.find(({ id }) => id === player.id)?.resources.GOLD).not.toBe(999_999)
  })

  it('keeps nested production costs independent from authoritative session state', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Position).set(1, { x: 0, y: 0 })
    world.store(Owner).set(1, { owner: 0 })
    world.store(Building).set(1, {
      buildingType: 'CASTLE',
      status: 'COMPLETED',
      progressTicks: 1,
      totalTicks: 1,
      builderId: null,
      footprint: { x: 0, y: 0, width: 5, height: 4 }
    })
    world.store(Production).set(1, {
      queue: [
        {
          unitKind: 'pawn',
          cost: { GOLD: 50 },
          reservedSupply: 1,
          progressTicks: 0,
          totalTicks: 100,
          status: 'QUEUED'
        }
      ]
    })
    const session = GameSession.create({
      seed: SEEDS.integration.session,
      identity: createRulesIdentity('session-test'),
      initialWorld: world
    })
    const observation = session.observe(true)
    Object.assign(observation.buildings[0]!.production!.queue[0]!.cost, { GOLD: 999_999 })

    expect(session.observe(true).buildings[0]!.production!.queue[0]!.cost.GOLD).toBe(50)
  })

  it('isolates nested building observations in both directions', () => {
    const session = createAuthoritativeMatch({
      type: 'match_request',
      protocolVersion: PROTOCOL_VERSION,
      scenarioId: 'default',
      aggression: 'passive',
      map: { source: 'catalog' }
    }).session
    const castleId = session.observe(true).buildings.find((candidate) => candidate.buildingType === 'CASTLE')!.id
    session.submit(0, [
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'RALLY', payload: { producerId: castleId, x: 768, y: 512 } }
      },
      {
        tick: 1,
        playerId: 0,
        sequence: 2,
        intent: { type: 'UPGRADE_CASTLE', payload: { castleId } }
      }
    ])
    session.advance()

    const observation = session.observe(true)
    const building = observation.buildings.find((candidate) => candidate.id === castleId)!
    const oldRallyPoint = building.rallyPoint!
    const oldTierUpgrade = building.tierUpgrade!
    const mutableObservation = session.observe(true).buildings.find((candidate) => candidate.id === castleId)!
    const rallyPoint = mutableObservation.rallyPoint!
    const tierUpgrade = mutableObservation.tierUpgrade!
    Object.assign(rallyPoint, { x: -1 })
    Object.assign(tierUpgrade, { progressTicks: -1 })

    const unchanged = session.observe(true).buildings.find((candidate) => candidate.id === castleId)!
    expect(unchanged.rallyPoint).toEqual({ x: 768, y: 512 })
    expect(unchanged.tierUpgrade?.progressTicks).toBe(1)

    session.advance()
    expect(oldRallyPoint).toEqual({ x: 768, y: 512 })
    expect(oldTierUpgrade).toEqual({ progressTicks: 1, totalTicks: 100 })
    expect(
      session.observe(true).buildings.find((candidate) => candidate.id === castleId)?.tierUpgrade?.progressTicks
    ).toBe(2)
  })

  it('projects carrying independently of the front order', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Position).set(1, { x: 0, y: 0 })
    world.store(Owner).set(1, { owner: 0 })
    world.store(Kind).set(1, 'pawn')
    world.store(Cargo).set(1, { amount: 5, capacity: 10, resourceType: 'GOLD' })
    world.createEntity(2)
    world.store(Position).set(2, { x: 64, y: 0 })
    world.store(Owner).set(2, { owner: 0 })
    world.store(Kind).set(2, 'pawn')
    world.store(Cargo).set(2, { amount: 0, capacity: 10, resourceType: null })
    const session = GameSession.create({
      seed: SEEDS.integration.session,
      identity: createRulesIdentity('session-test'),
      initialWorld: world
    })

    const projected = units(session)
    expect(projected.find((unit) => unit.id === 1)?.carrying).toBe(true)
    expect(projected.find((unit) => unit.id === 1)?.cargoType).toBe('GOLD')
    expect(projected.find((unit) => unit.id === 2)?.carrying).toBeUndefined()
    expect(projected.find((unit) => unit.id === 2)?.cargoType).toBeUndefined()
  })

  it('projects foundations with type, footprint, status, and progress', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Position).set(1, { x: 0, y: 0 })
    world.store(Owner).set(1, { owner: 0 })
    world.store(Building).set(1, {
      buildingType: 'BARRACKS',
      status: 'UNDER_CONSTRUCTION',
      progressTicks: 12,
      totalTicks: 100,
      builderId: null,
      footprint: { x: 0, y: 0, width: 3, height: 3 }
    })
    const session = GameSession.create({
      seed: SEEDS.integration.session,
      identity: createRulesIdentity('session-test'),
      initialWorld: world
    })
    expect(buildings(session)).toEqual([
      expect.objectContaining({
        id: 1,
        buildingType: 'BARRACKS',
        owner: 0,
        footprint: { width: 3, height: 3 },
        status: 'UNDER_CONSTRUCTION',
        progressTicks: 12,
        totalTicks: 100
      })
    ])
  })

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
    const projected = units(session)
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
    const playerZero = players(session).find((player) => player.id === 0)
    expect(playerZero!.defeated).toBe(true)
  })

  it('stays RUNNING while both sides have living units', () => {
    const { session } = combatSession(SEEDS.integration.moveOwn)
    session.advance()
    expect(session.phase()).toBe('RUNNING')
  })
})
