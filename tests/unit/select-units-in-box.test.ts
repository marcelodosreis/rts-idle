import { describe, expect, it } from 'vitest'
import { selectUnitsInBox } from '../../apps/web/src/features/match/selection/select-units-in-box.js'

describe('selectUnitsInBox', () => {
  const positions = new Map([
    [3, { x: 10, y: 10 }],
    [1, { x: 20.5, y: 20.5 }],
    [2, { x: 100, y: 100 }]
  ])

  it('selects units inside an inverted fractional rectangle deterministically', () => {
    expect(selectUnitsInBox(positions, { x: 30.5, y: 30.5 }, { x: 10, y: 10 })).toEqual([1, 3])
  })

  it('does not select units outside the rectangle', () => {
    expect(selectUnitsInBox(positions, { x: 0, y: 0 }, { x: 15, y: 15 })).toEqual([3])
  })
})
