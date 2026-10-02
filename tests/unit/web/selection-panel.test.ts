import { describe, expect, it } from 'vitest'
import { resourceCostLabel } from '../../../apps/web/src/features/match/lib/resource-cost'
import {
  canCancelConstruction,
  cancelRefundEstimate,
  constructionStatusLine,
  productionRefundEstimate,
  resourceRemainingLine
} from '../../../apps/web/src/features/match/lib/selection-panel-logic'

describe('selection panel labels', () => {
  it('shows completed buildings as ready instead of unassigned', () => {
    expect(
      constructionStatusLine({
        id: 1,
        buildingType: 'CASTLE',
        owner: 0,
        status: 'COMPLETED',
        progressTicks: 100,
        totalTicks: 100,
        builderId: null
      })
    ).toBe('Ready')
  })

  it('keeps the unassigned label for paused construction', () => {
    expect(
      constructionStatusLine({
        id: 1,
        buildingType: 'CASTLE',
        owner: 0,
        status: 'PAUSED',
        progressTicks: 35,
        totalTicks: 100,
        builderId: null
      })
    ).toBe('35/100 · No worker assigned')
  })

  it('uses the construction progress pattern during a Castle upgrade', () => {
    expect(
      constructionStatusLine({
        id: 1,
        buildingType: 'CASTLE',
        owner: 0,
        status: 'COMPLETED',
        progressTicks: 100,
        totalTicks: 100,
        builderId: null,
        tierUpgrade: { progressTicks: 82, totalTicks: 100 }
      })
    ).toBe('82/100')
  })

  it('shows the selected resource quantity', () => {
    expect(resourceRemainingLine({ id: 4, remaining: 275 })).toBe('275 remaining')
  })

  it('allows cancelling only non-completed constructions owned by the player', () => {
    const base: {
      readonly id: number
      readonly buildingType: 'CASTLE'
      readonly progressTicks: number
      readonly totalTicks: number
      readonly builderId: number | null
    } = { id: 1, buildingType: 'CASTLE', progressTicks: 0, totalTicks: 100, builderId: null }
    expect(canCancelConstruction({ ...base, owner: 0, status: 'FOUNDATION' }, 0)).toBe(true)
    expect(canCancelConstruction({ ...base, owner: 0, status: 'COMPLETED' }, 0)).toBe(false)
    expect(canCancelConstruction({ ...base, owner: 1, status: 'FOUNDATION' }, 0)).toBe(false)
  })

  it('estimates the refund from the remaining progress and definition cost', () => {
    const construction: Parameters<typeof cancelRefundEstimate>[0] = {
      id: 1,
      buildingType: 'CASTLE' as const,
      owner: 0,
      status: 'FOUNDATION' as const,
      progressTicks: 0,
      totalTicks: 100,
      builderId: null
    }
    expect(cancelRefundEstimate(construction, { GOLD: 100, WOOD: 40 })).toEqual({ GOLD: 75, WOOD: 30 })
    expect(cancelRefundEstimate({ ...construction, progressTicks: 50 }, { GOLD: 100 })).toEqual({ GOLD: 37 })
    expect(cancelRefundEstimate({ ...construction, progressTicks: 100, status: 'COMPLETED' }, { GOLD: 100 })).toEqual({
      GOLD: 0
    })
  })

  it('formats every defined resource in cost and refund values', () => {
    expect(resourceCostLabel({ GOLD: 20, WOOD: 5 })).toBe('20 gold · 5 wood')
    expect(
      productionRefundEstimate({
        unitKind: 'pawn',
        cost: { GOLD: 20, WOOD: 5 },
        reservedSupply: 1,
        progressTicks: 0,
        totalTicks: 100,
        status: 'QUEUED'
      })
    ).toEqual({ GOLD: 20, WOOD: 5 })
  })
})
