import { describe, expect, it } from 'vitest'
import {
  canCancelConstruction,
  cancelRefundEstimate,
  constructionStatusLine,
  mineralRemainingLine
} from '../../../apps/web/src/features/match/selection/selection-panel-logic'

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

  it('shows the selected mineral quantity', () => {
    expect(mineralRemainingLine({ id: 4, remaining: 275 })).toBe('275 remaining')
  })

  it('allows cancelling only non-completed constructions owned by the player', () => {
    const base = { id: 1, buildingType: 'CASTLE' as const, progressTicks: 0, totalTicks: 100, builderId: null }
    expect(canCancelConstruction({ ...base, owner: 0, status: 'FOUNDATION' }, 0)).toBe(true)
    expect(canCancelConstruction({ ...base, owner: 0, status: 'COMPLETED' }, 0)).toBe(false)
    expect(canCancelConstruction({ ...base, owner: 1, status: 'FOUNDATION' }, 0)).toBe(false)
  })

  it('estimates the refund from the remaining progress and definition cost', () => {
    const construction = {
      id: 1,
      buildingType: 'CASTLE' as const,
      owner: 0,
      status: 'FOUNDATION' as const,
      progressTicks: 0,
      totalTicks: 100,
      builderId: null
    }
    expect(cancelRefundEstimate(construction, 100)).toBe(75)
    expect(cancelRefundEstimate({ ...construction, progressTicks: 50 }, 100)).toBe(37)
    expect(cancelRefundEstimate({ ...construction, progressTicks: 100, status: 'COMPLETED' }, 100)).toBe(0)
  })
})
