import type { CommandIntent } from '@rts/shared'
import { describe, expect, it } from 'vitest'
import {
  type MatchInteractionContext,
  MatchInteractionController
} from '../../apps/web/src/features/match/selection/match-interaction-controller.js'

function context(overrides: Partial<MatchInteractionContext> = {}): MatchInteractionContext {
  const sent: CommandIntent[] = []
  const base: MatchInteractionContext = {
    isMatchEnded: () => false,
    selectedUnitIds: () => [1, 2],
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
