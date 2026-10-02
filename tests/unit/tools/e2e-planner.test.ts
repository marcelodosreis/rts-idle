import { describe, expect, it } from 'vitest'
import type { E2eTestCase } from '../../../tools/e2e/plan-types.js'
import { planGroups } from '../../../tools/e2e/planner.js'

const testCase = (id: string, durationMs: number, category: E2eTestCase['category'] = 'functional'): E2eTestCase => ({
  id,
  file: `${id}.spec.ts`,
  line: 1,
  title: id,
  category,
  browser: 'chromium',
  estimatedDurationMs: durationMs
})

describe('E2E shard planner', () => {
  it('balances the heaviest tests first', () => {
    const groups = planGroups(
      [testCase('a', 300), testCase('b', 210), testCase('c', 150), testCase('d', 100), testCase('e', 80)],
      { category: 'functional', browser: 'chromium', groupCount: 2 }
    )

    expect(groups.map((group) => group.estimatedDurationMs)).toEqual([400, 440])
    expect(
      groups
        .flatMap((group) => group.tests)
        .map((test) => test.id)
        .sort()
    ).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('does not mix categories or browsers', () => {
    const groups = planGroups(
      [
        testCase('functional', 10),
        { ...testCase('firefox', 20), browser: 'firefox' },
        testCase('performance', 30, 'performance')
      ],
      { category: 'functional', browser: 'chromium', groupCount: 2 }
    )

    expect(groups).toHaveLength(1)
    expect(groups[0]?.tests.map((test) => test.id)).toEqual(['functional'])
  })

  it('uses deterministic group names and ordering', () => {
    const tests = [testCase('b', 10), testCase('a', 10)]
    const first = planGroups(tests, { category: 'functional', browser: 'chromium', groupCount: 2 })
    const second = planGroups([...tests].reverse(), { category: 'functional', browser: 'chromium', groupCount: 2 })

    expect(first).toEqual(second)
    expect(first.map((group) => group.id)).toEqual(['functional-chromium-1', 'functional-chromium-2'])
  })
})
