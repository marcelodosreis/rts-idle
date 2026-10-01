import { GameSession } from '@rts/server'
import { tilesToFixed } from '@rts/shared'
import { Building, Cargo, createRulesIdentity, createWorld, Health, Kind, Owner, Position } from '@rts/simulation'
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

describe('game session commands', () => {
  it('returns the server scenario catalog when a local map fails bootstrap', () => {
    const result = bootstrapMatch({
      type: 'match_request',
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
      scenarioId: 'default',
      aggression: 'passive',
      map: { source: 'catalog' }
    }).session

    expect(session.projectUnits()).toHaveLength(10)
    expect(session.projectUnits().map(({ x, y }) => ({ x, y }))).toEqual([
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
    expect(session.projectUnits()).toEqual(
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
    expect(session.projectPlayers().find((player) => player.id === 0)?.resources.GOLD).toBe(250)
    expect(session.projectBuildings()).toHaveLength(2)
    expect(session.projectBuildings()).toEqual(
      expect.arrayContaining([expect.objectContaining({ buildingType: 'CASTLE', owner: 0 })])
    )
    expect(session.projectResources(true)).toEqual(
      expect.arrayContaining([expect.objectContaining({ remaining: 3000 })])
    )
    const worker = session.projectUnits()[0]!
    const node = session.projectResources(true).find((resource) => resource.remaining === 3000)!
    session.submit(0, [
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'GATHER', payload: { unitIds: [worker.id], resourceId: node.resourceId } }
      }
    ])
    expect(session.advance().rejected).toEqual([])
    expect(session.projectUnits()[0]!.x).not.toBe(worker.x)
    expect(session.projectUnits()[0]!.economy).toEqual(
      expect.objectContaining({
        phase: 'to_resource',
        cargoAmount: 0,
        cargoCapacity: 10,
        progressMax: 200,
        resourceId: node.resourceId
      })
    )
    for (let tick = 0; tick < 100 && session.projectUnits()[0]!.economy?.phase !== 'harvesting'; tick += 1) {
      session.advance()
    }
    expect(session.projectUnits()[0]!.economy).toEqual(expect.objectContaining({ phase: 'harvesting' }))
    expect(session.phase()).toBe('RUNNING')
  })

  it('keeps the normal simulation wallet at zero outside a configured demo scenario', () => {
    const session = GameSession.create({
      seed: SEEDS.integration.session,
      identity: createRulesIdentity('session-test')
    })

    expect(session.projectPlayers().find((player) => player.id === 0)?.resources.GOLD).toBe(0)
  })

  it('projects an empty resource delta while idle and every amount on reconnect', () => {
    const session = createAuthoritativeMatch({
      type: 'match_request',
      scenarioId: 'default',
      aggression: 'passive',
      map: { source: 'catalog' }
    }).session

    expect(session.projectResources(false)).toEqual([])
    session.advance()
    expect(session.projectResources(false)).toEqual([])
    const complete = session.projectResources(true)
    expect(complete).toHaveLength(41)
    expect(complete.every((resource) => resource.remaining > 0)).toBe(true)
  })

  it('projects a builder as moving, then building at its work point', () => {
    const session = createAuthoritativeMatch({
      type: 'match_request',
      scenarioId: 'default',
      aggression: 'passive',
      map: { source: 'catalog' }
    }).session
    const worker = session.projectUnits()[0]!

    session.submit(0, [
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'BUILD', payload: { unitId: worker.id, buildingType: 'CASTLE', x: 11, y: 9 } }
      }
    ])
    expect(session.advance().rejected).toEqual([])
    expect(session.projectUnits().find((unit) => unit.id === worker.id)?.orderState).toBe('moving')

    for (let tick = 0; tick < 100; tick += 1) {
      session.advance()
      if (session.projectUnits().find((unit) => unit.id === worker.id)?.orderState === 'building') {
        break
      }
    }
    expect(session.projectUnits().find((unit) => unit.id === worker.id)?.orderState).toBe('building')
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

    expect(session.projectUnits()).toEqual([expect.objectContaining({ id: 1, x: 0, y: 0, owner: 0, kind: 'pawn' })])
    expect(session.projectBuildings()).toEqual([
      expect.objectContaining({ id: 2, x: 256, y: 0, owner: 0, buildingType: 'CASTLE' })
    ])
    expect(session.projectResources(true)).toEqual([{ resourceId: 3, remaining: 25 }])
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

    const projected = session.projectUnits()
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
    expect(session.projectBuildings()).toEqual([
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
