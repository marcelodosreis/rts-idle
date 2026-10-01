import { describe, expect, it } from 'vitest'
import { observedDelta } from '../../../apps/web/src/features/match/ui/useObservedDelta'

describe('observedDelta', () => {
  it('reports positive and negative changes within one session', () => {
    expect(observedDelta(500, 550)).toBe(50)
    expect(observedDelta(550, 500)).toBe(-50)
  })

  it('does not compare a new session value with a cleared prior value', () => {
    expect(observedDelta(500, null)).toBeNull()
    expect(observedDelta(null, 300)).toBeNull()
  })
})
