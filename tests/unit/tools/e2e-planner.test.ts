import { describe, expect, it } from 'vitest'
import type { E2eBrowser, E2eCategory, E2ePlannedUnit } from '../../../tools/e2e/plan-types.js'
import { planGroups } from '../../../tools/e2e/planner.js'

const plannedUnit = (
  name: string,
  durationMs: number,
  category: E2eCategory = 'functional',
  browser: E2eBrowser = 'chromium'
): E2ePlannedUnit => ({
  id: `tests/e2e/${name}.spec.ts:1`,
  file: `tests/e2e/${name}.spec.ts`,
  line: 1,
  cases: [{ id: `${name}-case`, titlePath: [name] }],
  category,
  browser,
  estimatedDurationMs: durationMs
})

describe('E2E shard planner', () => {
  it('balances the heaviest units first', () => {
    const groups = planGroups(
      [
        plannedUnit('a', 300),
        plannedUnit('b', 210),
        plannedUnit('c', 150),
        plannedUnit('d', 100),
        plannedUnit('e', 80)
      ],
      { category: 'functional', browser: 'chromium', groupCount: 2 }
    )

    expect(groups.map((group) => group.estimatedDurationMs)).toEqual([400, 440])
    expect(
      groups
        .flatMap((group) => group.units)
        .map((unit) => unit.id)
        .sort()
    ).toHaveLength(5)
  })

  it('does not mix categories or browsers', () => {
    const groups = planGroups(
      [
        plannedUnit('functional', 10),
        plannedUnit('firefox', 20, 'functional', 'firefox'),
        plannedUnit('performance', 30, 'performance')
      ],
      { category: 'functional', browser: 'chromium', groupCount: 2 }
    )

    expect(groups).toHaveLength(1)
    expect(groups[0]?.units.map((unit) => unit.id)).toEqual(['tests/e2e/functional.spec.ts:1'])
  })

  it('uses deterministic group names and ordering', () => {
    const units = [plannedUnit('b', 10), plannedUnit('a', 10)]
    const first = planGroups(units, { category: 'functional', browser: 'chromium', groupCount: 2 })
    const second = planGroups([...units].reverse(), { category: 'functional', browser: 'chromium', groupCount: 2 })

    expect(first).toEqual(second)
    expect(first.map((group) => group.id)).toEqual(['functional-chromium-1', 'functional-chromium-2'])
  })
})
