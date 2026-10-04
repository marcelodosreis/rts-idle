import type { PlayerId, ResearchType } from '@rts/shared'
import { createSimulation, createWorld, Owner, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../../fixtures/index.js'

describe('simulation initialization ownership', () => {
  it('owns independent world, player, map, and resource state', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Position).set(1, { x: 0, y: 0 })
    world.store(Owner).set(1, { owner: 0 })
    const completedResearch: ResearchType[] = ['ECONOMY']
    const players = [
      {
        id: 0 as PlayerId,
        defeated: false,
        resources: { GOLD: 10, WOOD: 2 },
        completedResearch
      }
    ]
    const bounds = { width: 4, height: 4, invalidTiles: [{ x: 1, y: 1 }] }
    const resources = [
      {
        resourceId: 1,
        kind: 'GOLD_MINE' as const,
        x: 0,
        y: 0,
        variant: 0,
        initialAmount: 10,
        harvestAmount: 1,
        harvestTicks: 1,
        blocksNavigation: false
      }
    ]
    const simulation = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: world,
      initialPlayers: players,
      mapBounds: bounds,
      resources
    })

    world.store(Position).set(1, { x: 999, y: 999 })
    players[0]!.resources.GOLD = 0
    players[0]!.resources.WOOD = 0
    completedResearch.push('MOVEMENT')
    bounds.invalidTiles[0]!.x = 3
    resources[0]!.initialAmount = 0

    const state = simulation.inspectState()
    expect(state.world.store(Position).get(1)).toEqual({ x: 0, y: 0 })
    expect(state.players[0]!.resources).toEqual({ GOLD: 10, WOOD: 2 })
    expect(state.players[0]!.completedResearch).toEqual(['ECONOMY'])
    expect(state.mapBounds.invalidTiles).toEqual([{ x: 1, y: 1 }])
    expect(state.resources.amount(1)).toBe(10)
  })

  it('does not mutate the caller world, players, bounds, or resources while advancing', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Position).set(1, { x: 0, y: 0 })
    world.store(Owner).set(1, { owner: 0 })
    const completedResearch: ResearchType[] = ['ECONOMY']
    const players = ([0, 1, 2, 3] as const).map((id) => ({
      id,
      defeated: false,
      resources: { GOLD: id === 0 ? 10 : 0, WOOD: 2 },
      completedResearch: id === 0 ? completedResearch : ([] as ResearchType[])
    }))
    const bounds = { width: 4, height: 4, invalidTiles: [{ x: 1, y: 1 }] }
    const resources = [
      {
        resourceId: 1,
        kind: 'GOLD_MINE' as const,
        x: 0,
        y: 0,
        variant: 0,
        initialAmount: 10,
        harvestAmount: 1,
        harvestTicks: 1,
        blocksNavigation: false
      }
    ]
    const simulation = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: world,
      initialPlayers: players,
      mapBounds: bounds,
      resources
    })

    simulation.step([])

    expect(world.store(Position).get(1)).toEqual({ x: 0, y: 0 })
    expect(players[0]!.resources).toEqual({ GOLD: 10, WOOD: 2 })
    expect(completedResearch).toEqual(['ECONOMY'])
    expect(bounds.invalidTiles).toEqual([{ x: 1, y: 1 }])
    expect(resources[0]!.initialAmount).toBe(10)
  })
})
