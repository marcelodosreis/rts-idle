import { describe, expect, it } from 'vitest'
import { projectSelectionUnits } from '../../apps/web/src/interaction/selection-projection.js'

describe('projectSelectionUnits', () => {
  it('deduplicates through the caller and sorts HUD rows while deriving movement', () => {
    const states = new Map([
      [2, { kind: 'warrior' as const, owner: 0 }],
      [1, { kind: 'pawn' as const, owner: 0, carrying: true }]
    ])
    const positions = new Map([
      [1, { x: 10, y: 12 }],
      [2, { x: 20, y: 20 }]
    ])
    const previous = new Map([[1, { x: 10, y: 10 }]])

    expect(projectSelectionUnits(states, positions, previous, [2, 1, 2])).toEqual([
      { id: 1, kind: 'pawn', owner: 0, carrying: true, moving: true },
      { id: 2, kind: 'warrior', owner: 0, moving: false }
    ])
  })
})
