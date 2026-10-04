import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readPlan, selectGroup } from '../../../tools/e2e/plan-loader.js'

interface MutableCase {
  id: string
  titlePath: string[]
}

interface MutableUnit {
  id: string
  file: string
  line: number
  cases: MutableCase[]
  category: string
  browser: string
  estimatedDurationMs: number
}

interface MutableGroup {
  id: string
  category: string
  browser: string
  units: MutableUnit[]
  estimatedDurationMs: number
}

interface MutablePlan {
  version: number
  generatedAt: string
  groups: MutableGroup[]
}

const written: string[] = []

afterEach(() => {
  for (const path of written.splice(0)) {
    unlinkSync(path)
  }
})

function writePlan(value: unknown): string {
  mkdirSync('tmp', { recursive: true })
  const path = join('tmp', `e2e-plan-test-${process.pid}-${written.length}.json`)
  writeFileSync(path, JSON.stringify(value), 'utf8')
  written.push(path)
  return path
}

function group(id: string, category: string, browser: string): MutableGroup {
  const file = `tests/e2e/${category}-${browser}.spec.ts`
  return {
    id,
    category,
    browser,
    units: [
      {
        id: `${file}:1`,
        file,
        line: 1,
        cases: [{ id: 'case-1', titlePath: ['case'] }],
        category,
        browser,
        estimatedDurationMs: 10
      }
    ],
    estimatedDurationMs: 10
  }
}

function planFixture(): MutablePlan {
  return {
    version: 2,
    generatedAt: new Date(0).toISOString(),
    groups: [
      group('functional-chromium-1', 'functional', 'chromium'),
      group('functional-firefox-1', 'functional', 'firefox'),
      group('performance-chromium-1', 'performance', 'chromium'),
      group('performance-firefox-1', 'performance', 'firefox')
    ]
  }
}

describe('E2E plan artifact validation on consumption', () => {
  it('loads a complete plan and selects a matching group', () => {
    const plan = readPlan(writePlan(planFixture()))

    expect(plan.groups).toHaveLength(4)
    expect(selectGroup(plan, 'functional-chromium-1', 'chromium').units).toHaveLength(1)
    expect(() => selectGroup(plan, 'functional-chromium-1', 'firefox')).toThrow(/targets chromium/)
    expect(() => selectGroup(plan, 'missing-group', 'chromium')).toThrow(/not found/)
  })

  it('rejects a plan from a different schema version', () => {
    const fixture = planFixture()
    fixture.version = 1
    expect(() => readPlan(writePlan(fixture))).toThrow(/invalid E2E plan/)
  })

  it('rejects a plan missing a required scope', () => {
    const fixture = planFixture()
    fixture.groups = fixture.groups.slice(0, 3)
    expect(() => readPlan(writePlan(fixture))).toThrow(/missing performance\/firefox/)
  })

  it('rejects duplicate group ids and duplicate unit assignments', () => {
    const duplicateGroup = planFixture()
    duplicateGroup.groups.push(group('functional-chromium-1', 'functional', 'chromium'))
    expect(() => readPlan(writePlan(duplicateGroup))).toThrow(/invalid E2E plan/)

    const duplicateUnit = planFixture()
    duplicateUnit.groups.push(group('functional-chromium-2', 'functional', 'chromium'))
    expect(() => readPlan(writePlan(duplicateUnit))).toThrow(/duplicate unit assignment/)
  })

  it('rejects unit ids that do not match their file and line', () => {
    const fixture = planFixture()
    fixture.groups[0]!.units[0]!.id = 'tests/e2e/other.spec.ts:99'
    expect(() => readPlan(writePlan(fixture))).toThrow(/invalid E2E plan/)
  })

  it('rejects a unit assigned to both lanes for the same browser', () => {
    const fixture = planFixture()
    fixture.groups[2]!.units[0] = {
      ...fixture.groups[0]!.units[0]!,
      category: 'performance',
      browser: 'chromium'
    }
    expect(() => readPlan(writePlan(fixture))).toThrow(/both lanes/)
  })

  it('rejects unparseable plan content', () => {
    mkdirSync('tmp', { recursive: true })
    const path = join('tmp', `e2e-plan-test-broken-${process.pid}.json`)
    writeFileSync(path, '{not json', 'utf8')
    written.push(path)
    expect(() => readPlan(path)).toThrow(/invalid E2E plan/)
  })
})
