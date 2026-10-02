import { describe, expect, it } from 'vitest'
import { advanceTimedProgress } from '../../../packages/shared/src/domain/timed-progress.js'

describe('timed progress', () => {
  it('advances and clamps a finite activity at completion', () => {
    expect(advanceTimedProgress({ progressTicks: 4, totalTicks: 5 })).toEqual({ progressTicks: 5, completed: true })
    expect(advanceTimedProgress({ progressTicks: 5, totalTicks: 5 })).toEqual({ progressTicks: 5, completed: true })
  })
})
