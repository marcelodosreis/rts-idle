import { GameSession } from '@rts/server'
import { tilesToFixed } from '@rts/shared'
import {
  Building,
  Cargo,
  createRulesIdentity,
  createWorld,
  Health,
  Kind,
  MineralNode,
  Owner,
  Position
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { DEMO_SCENARIOS } from '../../apps/server/src/demo/scenarios.js'
import { bootstrapMatch, createAuthoritativeMatch } from '../../apps/server/src/match-bootstrap.js'
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
      scenarioId: '6v6',
      aggression: 'offensive',
      map: { source: 'local', definition: { width: 1, height: 1, tiles: ['land'] } }
    })

    expect(result).toEqual({
      error: {
        type: 'error',
        message: 'scenario spawn is outside or on invalid terrain',
        scenarios: DEMO_SCENARIOS.map(({ id, label }) => ({ id, label }))
      }
    })
  })

  it('seeds the economy sandbox with four Workers, two Bases, 250 minerals, and one Mineral Node', () => {
    const session = createAuthoritativeMatch({
      type: 'match_request',
      scenarioId: 'economy',
      aggression: 'passive',
      map: { source: 'catalog' }
    }).session

    expect(session.projectUnits()).toHaveLength(4)
    expect(session.projectUnits().map(({ x, y }) => ({ x, y }))).toEqual([
      { x: tilesToFixed(8), y: tilesToFixed(11) },
      { x: tilesToFixed(9), y: tilesToFixed(11) },
      { x: tilesToFixed(10), y: tilesToFixed(11) },
      { x: tilesToFixed(11), y: tilesToFixed(11) }
    ])
    expect(session.projectUnits()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: 0, kind: 'pawn' }),
        expect.objectContaining({ owner: 0, kind: 'pawn' }),
        expect.objectContaining({ owner: 0, kind: 'pawn' }),
        expect.objectContaining({ owner: 0, kind: 'pawn' })
      ])
    )
    expect(session.projectPlayers().find((player) => player.id === 0)?.gold).toBe(250)
    expect(session.projectBuildings()).toHaveLength(2)
    expect(session.projectBuildings()).toEqual(
      expect.arrayContaining([expect.objectContaining({ buildingType: 'BASE', owner: 0 })])
    )
    expect(session.projectMineralNodes()).toEqual([expect.objectContaining({ remaining: 3000 })])
    const worker = session.projectUnits()[0]!
    const node = session.projectMineralNodes()[0]!
    session.submit(0, [
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'GATHER', payload: { unitIds: [worker.id], nodeId: node.id } }
      }
    ])
    expect(session.advance().rejected).toEqual([])
    expect(session.projectUnits()[0]!.x).not.toBe(worker.x)
    expect(session.projectUnits()[0]!.economy).toEqual(
      expect.objectContaining({
        phase: 'to_node',
        cargoAmount: 0,
        cargoCapacity: 10,
        progressMax: 200,
        nodeId: node.id
      })
    )
    for (let tick = 0; tick < 100 && session.projectUnits()[0]!.economy?.phase !== 'gathering'; tick += 1) {
      session.advance()
    }
    expect(session.projectUnits()[0]!.economy).toEqual(expect.objectContaining({ phase: 'gathering' }))
    expect(session.phase()).toBe('RUNNING')
  })

  it('keeps the normal simulation wallet at zero outside a configured demo scenario', () => {
    const session = GameSession.create({
      seed: SEEDS.integration.session,
      identity: createRulesIdentity('session-test')
    })

    expect(session.projectPlayers().find((player) => player.id === 0)?.gold).toBe(0)
  })

  it('projects units, Bases, and Mineral Nodes as distinct observations', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Position).set(1, { x: 0, y: 0 })
    world.store(Owner).set(1, { owner: 0 })
    world.store(Kind).set(1, 'pawn')
    world.createEntity(2)
    world.store(Position).set(2, { x: 256, y: 0 })
    world.store(Owner).set(2, { owner: 0 })
    world.store(Building).set(2, {
      buildingType: 'BASE',
      status: 'COMPLETED',
      progressTicks: 1,
      totalTicks: 1,
      builderId: null,
      footprint: { x: 1, y: 0, width: 2, height: 2 }
    })
    world.createEntity(3)
    world.store(Position).set(3, { x: 512, y: 0 })
    world.store(MineralNode).set(3, { remaining: 25 })
    const session = GameSession.create({
      seed: SEEDS.integration.session,
      identity: createRulesIdentity('session-test'),
      initialWorld: world
    })

    expect(session.projectUnits()).toEqual([expect.objectContaining({ id: 1, x: 0, y: 0, owner: 0, kind: 'pawn' })])
    expect(session.projectBuildings()).toEqual([
      expect.objectContaining({ id: 2, x: 256, y: 0, owner: 0, buildingType: 'BASE' })
    ])
    expect(session.projectMineralNodes()).toEqual([{ id: 3, x: 512, y: 0, remaining: 25 }])
  })

  it('projects carrying independently of the front order', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Position).set(1, { x: 0, y: 0 })
    world.store(Owner).set(1, { owner: 0 })
    world.store(Kind).set(1, 'pawn')
    world.store(Cargo).set(1, { amount: 5, capacity: 10 })
    world.createEntity(2)
    world.store(Position).set(2, { x: 64, y: 0 })
    world.store(Owner).set(2, { owner: 0 })
    world.store(Kind).set(2, 'pawn')
    world.store(Cargo).set(2, { amount: 0, capacity: 10 })
    const session = GameSession.create({
      seed: SEEDS.integration.session,
      identity: createRulesIdentity('session-test'),
      initialWorld: world
    })

    const projected = session.projectUnits()
    expect(projected.find((unit) => unit.id === 1)?.carrying).toBe(true)
    expect(projected.find((unit) => unit.id === 2)?.carrying).toBeUndefined()
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
