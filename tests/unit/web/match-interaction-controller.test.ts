import type { CommandIntent } from '@rts/shared'
import { describe, expect, it } from 'vitest'
import {
  type MatchInteractionContext,
  MatchInteractionController
} from '../../../apps/web/src/features/match/selection/match-interaction-controller.js'

function context(overrides: Partial<MatchInteractionContext> = {}): MatchInteractionContext {
  const sent: CommandIntent[] = []
  const base: MatchInteractionContext = {
    isMatchEnded: () => false,
    selectedUnitIds: () => [1, 2],
    selectedConstructionId: () => null,
    mode: () => 'idle',
    unitStates: new Map([
      [1, { kind: 'pawn', owner: 0, carrying: true }],
      [2, { kind: 'warrior', owner: 0 }],
      [9, { kind: 'warrior', owner: 1 }]
    ]),
    buildings: () => [],
    placementFor: () => null,
    toCommandPoint: (x, y) => ({ x, y }),
    placementToCommandPoint: (placement) => ({ x: placement.x, y: placement.y }),
    buildingToCommandPoint: (building) => ({ x: building.x, y: building.y }),
    sendCommand: (intent) => sent.push(intent),
    clearMode: () => undefined,
    cancelPlacement: () => undefined,
    setBuildHint: () => undefined,
    humanPlayer: 0,
    ...overrides
  }
  return Object.assign(base, { sent }) as MatchInteractionContext
}

describe('MatchInteractionController', () => {
  it('translates ground and enemy targets into authoritative intents', () => {
    const match = context()
    const controller = new MatchInteractionController(match)

    controller.groundCommand(10.4, 20.6)
    controller.unitCommand(9)

    expect((match as MatchInteractionContext & { sent: CommandIntent[] }).sent).toEqual([
      { type: 'MOVE', payload: { unitIds: [1, 2], x: 10.4, y: 20.6 } },
      { type: 'ATTACK', payload: { unitIds: [1, 2], targetId: 9 } }
    ])
  })

  it('sets a producer rally point without requiring a unit selection', () => {
    const match = context({ selectedUnitIds: () => [], mode: () => ({ kind: 'rally', producerId: 7 }) })
    const controller = new MatchInteractionController(match)

    controller.groundCommand(10.4, 20.6)

    expect((match as MatchInteractionContext & { sent: CommandIntent[] }).sent).toEqual([
      { type: 'RALLY', payload: { producerId: 7, x: 10.4, y: 20.6 } }
    ])
  })

  it('uses a selected completed Base or Barracks as the rally shortcut target', () => {
    const match = context({
      selectedUnitIds: () => [],
      selectedConstructionId: () => 7,
      buildings: () => [
        {
          id: 7,
          buildingType: 'BARRACKS',
          x: 100,
          y: 200,
          owner: 0,
          footprint: { width: 2, height: 2 },
          status: 'COMPLETED',
          progressTicks: 100,
          totalTicks: 100
        }
      ]
    })

    new MatchInteractionController(match).groundCommand(30, 40)

    expect((match as MatchInteractionContext & { sent: CommandIntent[] }).sent).toEqual([
      { type: 'RALLY', payload: { producerId: 7, x: 30, y: 40 } }
    ])
  })

  it('does not use a Supply Depot as a rally shortcut target', () => {
    const match = context({
      selectedUnitIds: () => [],
      selectedConstructionId: () => 7,
      buildings: () => [
        {
          id: 7,
          buildingType: 'SUPPLY_DEPOT',
          x: 100,
          y: 200,
          owner: 0,
          footprint: { width: 2, height: 2 },
          status: 'COMPLETED',
          progressTicks: 100,
          totalTicks: 100
        }
      ]
    })

    new MatchInteractionController(match).groundCommand(30, 40)

    expect((match as MatchInteractionContext & { sent: CommandIntent[] }).sent).toEqual([])
  })

  it('deposits only carrying owned workers at a completed owned building', () => {
    const match = context({
      selectedUnitIds: () => [1, 2],
      buildings: () => [
        {
          id: 7,
          buildingType: 'BASE',
          x: 100,
          y: 200,
          owner: 0,
          footprint: { width: 2, height: 2 },
          status: 'COMPLETED',
          progressTicks: 100,
          totalTicks: 100
        }
      ]
    })
    const controller = new MatchInteractionController(match)

    controller.buildingCommand(7)

    expect((match as MatchInteractionContext & { sent: CommandIntent[] }).sent).toEqual([
      { type: 'DEPOSIT', payload: { unitIds: [1], buildingId: 7 } }
    ])
  })

  it('does not attack an unknown target with the local-owner fallback', () => {
    const match = context()
    const controller = new MatchInteractionController(match)

    controller.unitCommand(99)

    expect((match as MatchInteractionContext & { sent: CommandIntent[] }).sent).toEqual([])
  })

  it('repairs a damaged owned unit with the selected workers', () => {
    const match = context({
      selectedUnitIds: () => [2, 1],
      unitStates: new Map([
        [1, { kind: 'pawn', owner: 0 }],
        [2, { kind: 'warrior', owner: 0 }],
        [9, { kind: 'warrior', owner: 0, hp: 40, maxHp: 100 }]
      ])
    })

    new MatchInteractionController(match).unitCommand(9)

    expect((match as MatchInteractionContext & { sent: CommandIntent[] }).sent).toEqual([
      { type: 'REPAIR', payload: { unitIds: [1], targetId: 9 } }
    ])
  })

  it('repairs a damaged owned completed building with a non-carrying worker', () => {
    const match = context({
      unitStates: new Map([
        [1, { kind: 'pawn', owner: 0 }],
        [2, { kind: 'warrior', owner: 0 }]
      ]),
      buildings: () => [
        {
          id: 7,
          buildingType: 'BASE',
          x: 100,
          y: 200,
          owner: 0,
          footprint: { width: 2, height: 2 },
          status: 'COMPLETED',
          progressTicks: 100,
          totalTicks: 100,
          hp: 250,
          maxHp: 500
        }
      ]
    })

    new MatchInteractionController(match).buildingCommand(7)

    expect((match as MatchInteractionContext & { sent: CommandIntent[] }).sent).toEqual([
      { type: 'REPAIR', payload: { unitIds: [1], targetId: 7 } }
    ])
  })

  it('deposits cargo at a damaged owned completed building before considering repair', () => {
    const match = context({
      buildings: () => [
        {
          id: 7,
          buildingType: 'BASE',
          x: 100,
          y: 200,
          owner: 0,
          footprint: { width: 2, height: 2 },
          status: 'COMPLETED',
          progressTicks: 100,
          totalTicks: 100,
          hp: 250,
          maxHp: 500
        }
      ]
    })

    new MatchInteractionController(match).buildingCommand(7)

    expect((match as MatchInteractionContext & { sent: CommandIntent[] }).sent).toEqual([
      { type: 'DEPOSIT', payload: { unitIds: [1], buildingId: 7 } }
    ])
  })

  it('blocks every command after the match is finished', () => {
    const match = context({ isMatchEnded: () => true })
    const controller = new MatchInteractionController(match)

    controller.groundCommand(1, 2)
    controller.unitCommand(9)
    controller.buildingCommand(7)
    controller.mineralCommand(8)
    controller.handleBuildPlacementClick(1, 2)

    expect((match as MatchInteractionContext & { sent: CommandIntent[] }).sent).toEqual([])
  })
})
