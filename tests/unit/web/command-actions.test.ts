import type { BuildCatalogEntry, ProductionCatalogEntry } from '@rts/protocol'
import { describe, expect, it, vi } from 'vitest'
import { buildingRootActions, submenuActions } from '../../../apps/web/src/features/match/lib/command-actions'
import type { CommandBarProps } from '../../../apps/web/src/features/match/types/command-types'
import type { HudConstruction, HudResources } from '../../../apps/web/src/features/match/types/hud-types'

const CASTLE_CATALOG: BuildCatalogEntry = {
  type: 'CASTLE',
  label: 'Castle',
  footprint: { width: 3, height: 3 },
  cost: { GOLD: 100 },
  constructionTicks: 100,
  capabilities: { canProduce: false, canResearch: false, canUpgrade: true },
  maximumCastleTier: 2
}

const RESOURCES: HudResources = {
  resources: { GOLD: 500, WOOD: 0 },
  supply: 0,
  reservedSupply: 0,
  supplyCap: 10,
  castleTier: 1,
  completedResearch: [],
  queuedResearch: []
}

const CASTLE: HudConstruction = {
  id: 1,
  buildingType: 'CASTLE',
  owner: 0,
  status: 'COMPLETED',
  progressTicks: 100,
  totalTicks: 100,
  builderId: null,
  tier: 1
}

const ARCHERY_CATALOG: BuildCatalogEntry = {
  type: 'ARCHERY',
  label: 'Archery',
  footprint: { width: 3, height: 3 },
  cost: { GOLD: 150 },
  constructionTicks: 100,
  capabilities: { canProduce: true, canResearch: false, canUpgrade: false }
}

const ARCHERY: HudConstruction = { ...CASTLE, buildingType: 'ARCHERY' }

const ARCHERY_PRODUCTION: ProductionCatalogEntry = {
  unitKind: 'archer',
  producer: 'ARCHERY',
  cost: { GOLD: 125 },
  trainingTicks: 100,
  supply: 1
}

function props(overrides: Partial<CommandBarProps> = {}): CommandBarProps {
  return {
    selection: [],
    construction: CASTLE,
    resource: null,
    humanPlayer: 0,
    mode: 'idle',
    resources: RESOURCES,
    buildings: [CASTLE_CATALOG],
    production: [],
    research: [],
    onStop: vi.fn(),
    onHold: vi.fn(),
    onArm: vi.fn(),
    onCancelConstruction: vi.fn(),
    onCancelProduction: vi.fn(),
    onCancelResearch: vi.fn(),
    onUpgradeCastle: vi.fn(),
    onResearch: vi.fn(),
    onTrain: vi.fn(),
    onSetRally: vi.fn(),
    contextFeedback: null,
    modeInstruction: null,
    onNotify: vi.fn(),
    ...overrides
  }
}

describe('building root actions', () => {
  it('uses catalog production entries for a producer without a roster whitelist', () => {
    const properties = props({
      construction: ARCHERY,
      buildings: [ARCHERY_CATALOG],
      production: [ARCHERY_PRODUCTION]
    })

    expect(buildingRootActions(properties, vi.fn(), false, vi.fn()).map((action) => action.id)).toEqual([
      'train',
      'rally'
    ])
    expect(submenuActions(properties, 'train').map((action) => action.id)).toEqual(['train-archer'])
  })

  it('keeps the Upgrade action available for a Castle while a tier upgrade runs', () => {
    const building = { ...CASTLE, tierUpgrade: { progressTicks: 10, totalTicks: 100 } }
    const actions = buildingRootActions(props({ construction: building }), vi.fn(), false, vi.fn())

    expect(actions.map((action) => action.id)).toContain('upgrade')
  })

  it('does not offer a Castle upgrade for non-Castle buildings', () => {
    const barracks: HudConstruction = { ...CASTLE, buildingType: 'BARRACKS' }
    const actions = buildingRootActions(props({ construction: barracks }), vi.fn(), false, vi.fn())

    expect(actions.map((action) => action.id)).not.toContain('upgrade')
  })
})

describe('Castle upgrade actions', () => {
  it('offers the Castle II upgrade for a tier I Castle', () => {
    const [action] = submenuActions(props(), 'upgrade')

    expect(action).toMatchObject({
      id: 'upgrade-castle',
      label: 'Castle II',
      blockedReason: undefined
    })
  })

  it('blocks an unaffordable Castle II upgrade with a gold reason', () => {
    const resources: HudResources = { ...RESOURCES, resources: { GOLD: 20, WOOD: 0 } }
    const [action] = submenuActions(props({ resources }), 'upgrade')

    expect(action?.blockedReason).toBe('Requires 100 gold. You have 20.')
    expect(action?.blockedTarget).toBe('gold')
  })

  it('explains unavailable content after reaching the catalog maximum tier', () => {
    const [action] = submenuActions(props({ construction: { ...CASTLE, tier: 2 } }), 'upgrade')

    expect(action).toMatchObject({
      label: 'Castle III',
      blockedReason: 'Castle III content is unavailable.',
      blockedTarget: 'command'
    })
  })

  it('blocks the upgrade while a tier upgrade is running', () => {
    const building = { ...CASTLE, tierUpgrade: { progressTicks: 10, totalTicks: 100 } }
    const [action] = submenuActions(props({ construction: building }), 'upgrade')

    expect(action).toMatchObject({
      label: 'Castle II',
      blockedReason: 'Castle upgrade in progress.',
      blockedTarget: 'command'
    })
  })
})
