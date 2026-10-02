import { describe, expect, it } from 'vitest'
import { estimateTests, mergeTimings, readTimingHistory } from '../../../tools/e2e/timing-history.js'

describe('E2E timing history', () => {
  it('fails closed for invalid history', () => {
    expect(readTimingHistory({ version: 2, timings: [] })).toEqual({ version: 1, timings: [] })
  })

  it('uses matching category and browser timings', () => {
    const tests = [
      {
        id: 'a',
        file: 'a.spec.ts',
        line: 1,
        title: 'a',
        category: 'functional' as const,
        browser: 'chromium' as const
      },
      { id: 'b', file: 'b.spec.ts', line: 1, title: 'b', category: 'functional' as const, browser: 'chromium' as const }
    ]
    const history = readTimingHistory({
      version: 1,
      timings: [
        { id: 'a', category: 'functional', browser: 'chromium', durationMs: 123, status: 'passed' },
        { id: 'a', category: 'functional', browser: 'firefox', durationMs: 999, status: 'passed' }
      ]
    })

    expect(estimateTests(tests, history).map((test) => test.estimatedDurationMs)).toEqual([123, 60_000])
  })

  it('keeps the latest timing for each test identity', () => {
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
