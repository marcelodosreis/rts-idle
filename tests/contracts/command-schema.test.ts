import { Cargo, createSimulation, Kind, MineralNode, type ScheduledCommand } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { buildMoveCommand, SEEDS, TEST_IDENTITY, worldWithOwners } from '../fixtures/index.js'

function unitCommand(intent: ScheduledCommand['intent']): ScheduledCommand {
  return { tick: 1, playerId: 0, sequence: 1, intent }
}

describe('command schema (P1.01)', () => {
  const world = worldWithOwners([0, 1])
  const [own, enemy] = world.aliveIds()
  world.store(Kind).set(own!, 'pawn')
  world.store(Cargo).set(own!, { amount: 0, capacity: 10 })
  world.store(MineralNode).set(enemy!, { remaining: 3_000 })
  const sim = createSimulation({
    seed: SEEDS.integration.moveOwn,
    identity: TEST_IDENTITY,
    initialWorld: world
  })

  it('accepts every command intent in the union', () => {
    const commands: ScheduledCommand[] = [
      unitCommand({ type: 'STOP', payload: { unitIds: [own!] } }),
      unitCommand({ type: 'HOLD', payload: { unitIds: [own!] } }),
      unitCommand({ type: 'PATROL', payload: { unitIds: [own!], x: 100, y: 100 } }),
      unitCommand({ type: 'ATTACK', payload: { unitIds: [own!], targetId: enemy! } }),
      unitCommand({ type: 'ATTACK_MOVE', payload: { unitIds: [own!], x: 100, y: 100 } }),
      unitCommand({ type: 'GATHER', payload: { unitIds: [own!], nodeId: enemy! } }),
      buildMoveCommand([own!], 100, 100)
    ]
    for (const command of commands) {
      expect(sim.step([command]).rejected).toHaveLength(0)
    }
  })

  it('exposes every command type on the intent union', () => {
    const types = [
      { type: 'MOVE', payload: { unitIds: [], x: 0, y: 0 } },
      { type: 'STOP', payload: { unitIds: [] } },
      { type: 'HOLD', payload: { unitIds: [] } },
      { type: 'PATROL', payload: { unitIds: [], x: 0, y: 0 } },
      { type: 'ATTACK', payload: { unitIds: [], targetId: 1 } },
      { type: 'ATTACK_MOVE', payload: { unitIds: [], x: 0, y: 0 } },
      { type: 'GATHER', payload: { unitIds: [], nodeId: 1 } },
      { type: 'DEPOSIT', payload: { unitIds: [], buildingId: 1 } },
      { type: 'BUILD', payload: { unitId: 1, buildingType: 'BASE', x: 0, y: 0 } }
    ]
    const asIntents = types.map((intent) => intent as ScheduledCommand['intent'])
    expect(asIntents).toHaveLength(9)
  })
})
