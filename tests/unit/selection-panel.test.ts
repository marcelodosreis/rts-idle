import { describe, expect, it } from 'vitest'
import {
  constructionStatusLine,
  mineralRemainingLine
} from '../../apps/web/src/features/match/selection/selection-panel-logic'

describe('selection panel labels', () => {
  it('shows completed buildings as ready instead of unassigned', () => {
    expect(
      constructionStatusLine({
        id: 1,
        buildingType: 'BASE',
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
        buildingType: 'BASE',
        owner: 0,
        status: 'PAUSED',
        progressTicks: 35,
        totalTicks: 100,
        builderId: null
      })
    ).toBe('35/100 · No worker assigned')
  })

  it('shows the selected mineral quantity', () => {
    expect(mineralRemainingLine({ id: 4, remaining: 275 })).toBe('275 remaining')
  })
})
