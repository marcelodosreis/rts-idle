import { createPlayerResources, type PlayerId, type SimulationEvent, START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  createSimulation,
  createWorld,
  hashObservation,
  isVisibleTile,
  Kind,
  Owner,
  Position,
  simulationFromSnapshot,
  visionForPlayer
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { TEST_IDENTITY } from '../fixtures/index.js'

const MAP_BOUNDS = { width: 32, height: 32 } as const

function worldAt(placements: readonly { readonly owner: PlayerId; readonly x: number; readonly y: number }[]) {
  const world = createWorld()
  placements.forEach((placement, index) => {
    const id = START_ENTITY_ID + index
    world.createEntity(id)
    world.store(Position).set(id, { x: tilesToFixed(placement.x), y: tilesToFixed(placement.y) })
    world.store(Owner).set(id, { owner: placement.owner })
    world.store(Kind).set(id, 'pawn')
  })
  return world
}

function simulationForWorld(world: ReturnType<typeof worldAt>, hiddenEnemyX = 24) {
  return createSimulation({
    seed: 9,
    identity: TEST_IDENTITY,
    mapBounds: MAP_BOUNDS,
    initialWorld: world,
    initialPlayers: [0, 1, 2, 3].map((id) => ({
      id: id as PlayerId,
      defeated: false,
      resources: createPlayerResources()
    })),
    resources: [
      {
        resourceId: 1,
        kind: 'TREE',
        x: tilesToFixed(10),
        y: tilesToFixed(8),
        variant: 0,
        initialAmount: 100,
        harvestAmount: 10,
        harvestTicks: 10,
        blocksNavigation: false
      },
      {
        resourceId: 2,
        kind: 'GOLD_MINE',
        x: tilesToFixed(hiddenEnemyX),
        y: tilesToFixed(24),
        variant: 0,
        initialAmount: 100,
        harvestAmount: 10,
        harvestTicks: 10,
        blocksNavigation: false
      }
    ]
  })
}

describe('player vision and memory', () => {
  it("exposes only each player's visible entities and resources", () => {
    const simulation = simulationForWorld(
      worldAt([
        { owner: 0, x: 8, y: 8 },
        { owner: 1, x: 24, y: 24 }
      ])
    )

    const playerZero = simulation.observeForPlayer(0, true)
    const playerOne = simulation.observeForPlayer(1, true)

    expect(playerZero.units.map((unit) => unit.owner)).toEqual([0])
    expect(playerOne.units.map((unit) => unit.owner)).toEqual([1])
    expect(playerZero.resources.map((resource) => resource.resourceId)).toEqual([1])
    expect(playerOne.resources.map((resource) => resource.resourceId)).toEqual([2])
    expect(playerZero.fog.visibleTiles).toContain(8 * 32 + 8)
    expect(playerZero.fog.visibleTiles).not.toContain(24 * 32 + 24)
    expect(playerZero.players.find((player) => player.id === 1)?.resources).toEqual({ GOLD: 0, WOOD: 0 })
  })

  it('uses a four-tile circular visibility radius', () => {
    const simulation = simulationForWorld(worldAt([{ owner: 0, x: 8, y: 8 }]))
    const state = simulation.inspectState()
    const vision = visionForPlayer(state, 0)

    expect(state.vision.radiusTiles).toBe(4)
    expect(isVisibleTile(vision, state.vision.width, 8, 8)).toBe(true)
    expect(isVisibleTile(vision, state.vision.width, 12, 8)).toBe(true)
    expect(isVisibleTile(vision, state.vision.width, 10, 10)).toBe(true)
    expect(isVisibleTile(vision, state.vision.width, 11, 11)).toBe(false)
    expect(isVisibleTile(vision, state.vision.width, 13, 8)).toBe(false)
  })

  it('keeps explored memory and restores it deterministically', () => {
    const simulation = simulationForWorld(worldAt([{ owner: 0, x: 8, y: 8 }]))
    const initial = simulation.observeForPlayer(0, true)
    expect(initial.fog.exploredTiles).toContain(8 * 32 + 8)
    expect(initial.fog.exploredTiles).not.toContain(24 * 32 + 24)

    const restored = simulationFromSnapshot(simulation.exportSnapshot())
    expect(hashObservation(restored.observeForPlayer(0, true))).toBe(hashObservation(initial))
    expect(restored.observeForPlayer(0, true).fog).toEqual(initial.fog)
  })

  it('does not treat coordinates outside the map as visible', () => {
    const simulation = simulationForWorld(worldAt([{ owner: 0, x: 0, y: 0 }]))
    const state = simulation.inspectState()
    const fog = simulation.observeForPlayer(0, true).fog

    expect(isVisibleTile(visionForPlayer(state, 0), state.vision.width, 0, state.vision.height)).toBe(false)
    expect(fog.visibleTiles.every((index) => index < MAP_BOUNDS.width * MAP_BOUNDS.height)).toBe(true)
  })

  it('does not expose hidden-world differences through the player observation', () => {
    const visible = worldAt([{ owner: 0, x: 8, y: 8 }])
    const first = simulationForWorld(visible, 20)
    const second = simulationForWorld(visible, 26)

    expect(first.hashState()).not.toBe(second.hashState())
    expect(hashObservation(first.observeForPlayer(0, true))).toBe(hashObservation(second.observeForPlayer(0, true)))
    expect(first.observeForPlayer(0, true)).toEqual(second.observeForPlayer(0, true))
  })

  it('filters events whose entity payload is outside the player vision', () => {
    const simulation = simulationForWorld(
      worldAt([
        { owner: 0, x: 8, y: 8 },
        { owner: 1, x: 24, y: 24 }
      ])
    )
    const events = [
      { type: 'damageDealt', targetId: START_ENTITY_ID, amount: 1, targetHp: 99 },
      { type: 'damageDealt', targetId: START_ENTITY_ID + 1, amount: 1, targetHp: 99 }
    ] satisfies readonly SimulationEvent[]

    expect(simulation.filterEventsForPlayer(0, events)).toEqual([events[0]])
  })
})
