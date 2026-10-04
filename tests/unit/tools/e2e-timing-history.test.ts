import { describe, expect, it } from 'vitest'
import type { E2eTestUnit } from '../../../tools/e2e/plan-types.js'
import { estimateUnits, mergeTimings, readTimingHistory } from '../../../tools/e2e/timing-history.js'

const unit = (id: string): E2eTestUnit => ({
  id,
  file: `${id}.spec.ts`,
  line: 1,
  cases: [{ id: `${id}-case`, titlePath: [id] }],
  category: 'functional',
  browser: 'chromium'
})

describe('E2E timing history', () => {
  it('fails closed for invalid history', () => {
    expect(readTimingHistory({ version: 2, timings: [] })).toEqual({ version: 1, timings: [] })
  })

  it('uses matching category and browser timings', () => {
    const history = readTimingHistory({
      version: 1,
      timings: [
        { id: 'a', category: 'functional', browser: 'chromium', durationMs: 123, status: 'passed' },
        { id: 'a', category: 'functional', browser: 'firefox', durationMs: 999, status: 'passed' }
      ]
    })

    expect(estimateUnits([unit('a'), unit('b')], history).map((value) => value.estimatedDurationMs)).toEqual([
      123, 60_000
    ])
  })

  it('keeps the latest timing for each unit identity', () => {
    const history = mergeTimings([
      {
        version: 1,
        timings: [{ id: 'a', category: 'functional', browser: 'chromium', durationMs: 10, status: 'passed' }]
      },
      {
        version: 1,
        timings: [{ id: 'a', category: 'functional', browser: 'chromium', durationMs: 20, status: 'passed' }]
      }
    ])

    expect(history.timings).toEqual([
      { id: 'a', category: 'functional', browser: 'chromium', durationMs: 20, status: 'passed' }
    ])
  })
})
