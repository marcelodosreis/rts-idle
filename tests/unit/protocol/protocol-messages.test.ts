import { isCommandMessage, isErrorMessage, isMatchConfig, isMatchRequest, isSnapshotMessage } from '@rts/protocol'
import { describe, expect, it } from 'vitest'

describe('match bootstrap messages', () => {
  const map = { width: 2, height: 2, tiles: ['land', 'land', 'land', 'land'] }
  it('accepts a valid request and config', () => {
    expect(
      isMatchRequest({
        type: 'match_request',
        scenarioId: '6v6',
        aggression: 'offensive',
        map: { source: 'local', definition: map }
      })
    ).toBe(true)
    expect(
      isMatchConfig({
        type: 'match_config',
        scenario: { id: '6v6', label: '6v6' },
        scenarios: [{ id: '6v6', label: '6v6' }],
        map,
        buildings: [
          { type: 'BASE', label: 'Base', footprint: { width: 2, height: 2 }, costMinerals: 100, constructionTicks: 100 }
        ],
        production: [{ unitKind: 'pawn', producer: 'BASE', costMinerals: 50, trainingTicks: 100, supply: 1 }]
      })
    ).toBe(true)
  })
  it('rejects malformed bootstrap payloads', () => {
    expect(
      isMatchRequest({ type: 'match_request', scenarioId: '', aggression: 'offensive', map: { source: 'catalog' } })
    ).toBe(false)
    expect(
      isMatchRequest({
        type: 'match_request',
        scenarioId: '6v6',
        aggression: 'offensive',
        map: { source: 'local', definition: { width: 999, height: 1, tiles: [] } }
      })
    ).toBe(false)
  })
})

describe('protocol command message', () => {
  it('accepts every command intent', () => {
    const commands = [
      { type: 'command', intent: { type: 'MOVE', payload: { unitIds: [1, 2], x: 100, y: 200 } } },
      { type: 'command', intent: { type: 'STOP', payload: { unitIds: [1] } } },
      { type: 'command', intent: { type: 'HOLD', payload: { unitIds: [1] } } },
      { type: 'command', intent: { type: 'PATROL', payload: { unitIds: [1], x: 100, y: 200 } } },
      { type: 'command', intent: { type: 'ATTACK', payload: { unitIds: [1], targetId: 5 } } },
      { type: 'command', intent: { type: 'ATTACK_MOVE', payload: { unitIds: [1], x: 100, y: 200 } } },
      { type: 'command', intent: { type: 'REPAIR', payload: { unitIds: [1, 2], targetId: 5 } } },
      { type: 'command', intent: { type: 'CANCEL_CONSTRUCTION', payload: { buildingId: 5 } } },
      { type: 'command', intent: { type: 'TRAIN', payload: { producerId: 5, unitKind: 'warrior' } } },
      { type: 'command', intent: { type: 'RALLY', payload: { producerId: 5, x: 100, y: 200 } } },
      { type: 'command', intent: { type: 'SURRENDER', payload: {} } }
    ]
    for (const message of commands) {
      expect(isCommandMessage(message)).toBe(true)
    }
  })

  it('rejects non-conforming command payloads', () => {
    expect(isCommandMessage(null)).toBe(false)
    expect(isCommandMessage({ type: 'command' })).toBe(false)
    expect(isCommandMessage({ type: 'MOVE', unitIds: [1], x: 0, y: 0 })).toBe(false)
    expect(
      isCommandMessage({ type: 'command', intent: { type: 'MOVE', payload: { unitIds: [1], x: 0.5, y: 0 } } })
    ).toBe(false)
    expect(isCommandMessage({ type: 'command', intent: { type: 'MOVE', payload: { unitIds: '1', x: 0, y: 0 } } })).toBe(
      false
    )
    expect(
      isCommandMessage({ type: 'command', intent: { type: 'ATTACK', payload: { unitIds: [1], targetId: 2.5 } } })
    ).toBe(false)
    expect(
      isCommandMessage({ type: 'command', intent: { type: 'REPAIR', payload: { unitIds: [1], targetId: 2.5 } } })
    ).toBe(false)
    expect(isCommandMessage({ type: 'command', intent: { type: 'SURRENDER', payload: { unitIds: [1] } } })).toBe(false)
    expect(
      isCommandMessage({ type: 'command', intent: { type: 'CANCEL_CONSTRUCTION', payload: { buildingId: 1.5 } } })
    ).toBe(false)
    expect(isCommandMessage({ type: 'command', intent: { type: 'FLY', payload: {} } })).toBe(false)
    expect(
      isCommandMessage({ type: 'command', intent: { type: 'RALLY', payload: { producerId: 1, x: 0.5, y: 0 } } })
    ).toBe(false)
  })
})

describe('protocol snapshot message', () => {
  const valid = {
    type: 'snapshot',
    tick: 7,
    phase: 'RUNNING' as const,
    units: [
      { id: 1, x: 256, y: 512, owner: 0, kind: 'pawn', hp: 90, maxHp: 100, orderState: 'attacking' },
      { id: 2, x: 0, y: 0, owner: 1 }
    ],
    buildings: [
      {
        id: 5,
        buildingType: 'BARRACKS',
        x: 512,
        y: 768,
        owner: 0,
        builderId: 1,
        footprint: { width: 3, height: 3 },
        status: 'UNDER_CONSTRUCTION',
        progressTicks: 12,
        totalTicks: 100,
        hp: 500,
        maxHp: 500
      }
    ],
    mineralNodes: [{ id: 4, x: 768, y: 256, remaining: 3000 }],
    players: [
      { id: 0, defeated: false, gold: 0, usedSupply: 2, reservedSupply: 1, supplyCap: 10 },
      { id: 1, defeated: true, gold: 5, usedSupply: 0, supplyCap: 0 }
    ],
    events: [{ type: 'damageDealt', targetId: 1, amount: 10, targetHp: 90 }]
  }

  it('accepts a valid snapshot message', () => {
    expect(isSnapshotMessage(valid)).toBe(true)
  })

  it('accepts a projected rally point', () => {
    expect(
      isSnapshotMessage({ ...valid, buildings: [{ ...valid.buildings[0], rallyPoint: { x: 256, y: 512 } }] })
    ).toBe(true)
  })

  it('accepts a producer queue for Pawn and military units', () => {
    expect(
      isSnapshotMessage({
        ...valid,
        buildings: [
          {
            ...valid.buildings[0],
            status: 'COMPLETED',
            builderId: null,
            production: {
              queue: [
                {
                  unitKind: 'pawn',
                  costMinerals: 50,
                  reservedSupply: 1,
                  progressTicks: 4,
                  totalTicks: 100,
                  status: 'ACTIVE'
                },
                {
                  unitKind: 'warrior',
                  costMinerals: 100,
                  reservedSupply: 1,
                  progressTicks: 0,
                  totalTicks: 200,
                  status: 'QUEUED'
                },
                {
                  unitKind: 'archer',
                  costMinerals: 125,
                  reservedSupply: 1,
                  progressTicks: 300,
                  totalTicks: 300,
                  status: 'COMPLETED_WAITING'
                }
              ]
            }
          }
        ]
      })
    ).toBe(true)
  })

  it('accepts a finished snapshot', () => {
    expect(isSnapshotMessage({ ...valid, phase: 'FINISHED' })).toBe(true)
  })

  it('accepts a snapshot with no units', () => {
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 0,
        phase: 'RUNNING',
        units: [],
        buildings: [],
        mineralNodes: [],
        players: [],
        events: []
      })
    ).toBe(true)
  })

  it('rejects invalid authoritative supply values', () => {
    expect(
      isSnapshotMessage({ ...valid, players: [{ id: 0, defeated: false, gold: 0, usedSupply: -1, supplyCap: 10 }] })
    ).toBe(false)
    expect(
      isSnapshotMessage({ ...valid, players: [{ id: 0, defeated: false, gold: 0, usedSupply: 2, supplyCap: 201 }] })
    ).toBe(false)
  })

  it('accepts a unit with optional combat fields omitted', () => {
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 0,
        phase: 'RUNNING',
        units: [{ id: 1, x: 0, y: 0, owner: 0 }],
        buildings: [],
        mineralNodes: [],
        players: [],
        events: []
      })
    ).toBe(true)
  })

  it('validates authoritative economy presentation state', () => {
    const economy = {
      phase: 'gathering',
      cargoAmount: 3,
      cargoCapacity: 10,
      progressTicks: 12,
      progressMax: 200,
      nodeId: 4
    }
    expect(isSnapshotMessage({ ...valid, units: [{ ...valid.units[0], economy }] })).toBe(true)
    expect(
      isSnapshotMessage({ ...valid, units: [{ ...valid.units[0], economy: { ...economy, cargoAmount: 11 } }] })
    ).toBe(false)
    expect(
      isSnapshotMessage({ ...valid, units: [{ ...valid.units[0], economy: { ...economy, phase: 'teleporting' } }] })
    ).toBe(false)
    expect(
      isSnapshotMessage({ ...valid, units: [{ ...valid.units[0], economy: { ...economy, progressMax: 0 } }] })
    ).toBe(false)
  })

  it('validates the optional carrying flag', () => {
    expect(isSnapshotMessage({ ...valid, units: [{ ...valid.units[0], carrying: true }] })).toBe(true)
    expect(isSnapshotMessage({ ...valid, units: [{ ...valid.units[0], carrying: 'yes' }] })).toBe(false)
  })

  it('rejects unknown kinds, order states, and phases', () => {
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 1,
        phase: 'RUNNING',
        units: [{ id: 1, x: 0, y: 0, owner: 0, kind: 'zeppelin' }],
        buildings: [],
        mineralNodes: [],
        players: [],
        events: []
      })
    ).toBe(false)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 1,
        phase: 'RUNNING',
        units: [{ id: 1, x: 0, y: 0, owner: 0, orderState: 'flying' }],
        buildings: [],
        mineralNodes: [],
        players: [],
        events: []
      })
    ).toBe(false)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 1,
        phase: 'PAUSED',
        units: [],
        buildings: [],
        mineralNodes: [],
        players: [],
        events: []
      })
    ).toBe(false)
  })

  it('requires and validates buildings and Mineral Node projections', () => {
    const { buildings: _buildings, ...withoutBuildings } = valid
    const { mineralNodes: _mineralNodes, ...withoutMineralNodes } = valid
    expect(isSnapshotMessage(withoutBuildings)).toBe(false)
    expect(isSnapshotMessage(withoutMineralNodes)).toBe(false)
    expect(isSnapshotMessage({ ...valid, buildings: [{ ...valid.buildings[0]!, owner: 4 }] })).toBe(false)
    expect(isSnapshotMessage({ ...valid, mineralNodes: [{ id: 4, x: 0, y: 0, remaining: -1 }] })).toBe(false)
  })

  it('validates construction projection state', () => {
    expect(isSnapshotMessage({ ...valid, buildings: [{ ...valid.buildings[0]!, progressTicks: 101 }] })).toBe(false)
    expect(
      isSnapshotMessage({
        ...valid,
        buildings: [{ ...valid.buildings[0]!, footprint: { width: 0, height: 3 } }]
      })
    ).toBe(false)
    expect(isSnapshotMessage({ ...valid, buildings: [{ ...valid.buildings[0]!, buildingType: 'TOWER' }] })).toBe(false)
    expect(isSnapshotMessage({ ...valid, buildings: [{ ...valid.buildings[0]!, builderId: -1 }] })).toBe(false)
  })

  it('rejects malformed players and events', () => {
    expect(
      isSnapshotMessage({ type: 'snapshot', tick: 1, phase: 'RUNNING', units: [], players: [null], events: [] })
    ).toBe(false)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 1,
        phase: 'RUNNING',
        units: [],
        players: [],
        events: [{ type: 'nope' }]
      })
    ).toBe(false)
  })

  it('rejects non-conforming payloads', () => {
    expect(isSnapshotMessage(null)).toBe(false)
    expect(isSnapshotMessage({ type: 'snapshot', tick: 1 })).toBe(false)
    expect(
      isSnapshotMessage({ type: 'snapshot', tick: 1.5, phase: 'RUNNING', units: [], players: [], events: [] })
    ).toBe(false)
    expect(
      isSnapshotMessage({ type: 'snapshot', tick: 1, phase: 'RUNNING', units: '[]', players: [], events: [] })
    ).toBe(false)
    expect(
      isSnapshotMessage({ type: 'snapshot', tick: 1, phase: 'RUNNING', units: [null], players: [], events: [] })
    ).toBe(false)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 1,
        phase: 'RUNNING',
        units: [{ id: 1, x: 1.5, y: 0, owner: 0 }],
        players: [],
        events: []
      })
    ).toBe(false)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 1,
        phase: 'RUNNING',
        units: [{ id: 1, x: 1, y: 0, owner: 4 }],
        players: [],
        events: []
      })
    ).toBe(false)
    expect(isSnapshotMessage({ type: 'error', tick: 1, phase: 'RUNNING', units: [], players: [], events: [] })).toBe(
      false
    )
  })
})

describe('protocol error message', () => {
  it('accepts a valid error message', () => {
    expect(isErrorMessage({ type: 'error', message: 'boom' })).toBe(true)
  })

  it('accepts an error message with an optional scenario catalog', () => {
    expect(
      isErrorMessage({
        type: 'error',
        message: 'scenario spawn is outside or on invalid terrain',
        scenarios: [{ id: '6v6', label: '6v6' }]
      })
    ).toBe(true)
  })

  it('rejects non-conforming payloads', () => {
    expect(isErrorMessage(null)).toBe(false)
    expect(isErrorMessage({ type: 'error' })).toBe(false)
    expect(isErrorMessage({ type: 'error', message: 42 })).toBe(false)
    expect(isErrorMessage({ type: 'error', message: 'boom', scenarios: [{ id: '', label: '6v6' }] })).toBe(false)
    expect(isErrorMessage({ type: 'error', message: 'boom', scenarios: '6v6' })).toBe(false)
    expect(isErrorMessage({ type: 'snapshot', message: 'x' })).toBe(false)
  })
})
