import { describe, expect, it } from 'vitest'
import { executionUnits, parseTestList } from '../../../tools/e2e/discover-tests.js'
import type { E2eBrowser, E2eCategory, E2eTestUnit } from '../../../tools/e2e/plan-types.js'
import {
  assertNoCategoryLeakage,
  assertPlanComplete,
  type E2ePlanScope,
  planGroups
} from '../../../tools/e2e/planner.js'

function spec(id: string, title: string, line: number): object {
  return {
    id,
    title,
    file: 'web-routes.spec.ts',
    line,
    column: 3,
    tests: [{ projectName: 'chromium' }, { projectName: 'firefox' }]
  }
}

const LIST_OUTPUT = JSON.stringify({
  suites: [
    {
      title: 'web-routes.spec.ts',
      file: 'web-routes.spec.ts',
      specs: [spec('spec-1', 'loads /laboratory', 11), spec('spec-2', 'loads /editor', 11), spec('spec-3', 'other', 25)]
    }
  ]
})

function unit(id: string, category: E2eCategory, browser: E2eBrowser, caseIds: readonly string[]): E2eTestUnit {
  return {
    id,
    file: id.split(':')[0]!,
    line: Number(id.split(':')[1]),
    cases: caseIds.map((caseId) => ({ id: caseId, titlePath: [caseId] })),
    category,
    browser
  }
}

function planned(unitValue: E2eTestUnit) {
  return { ...unitValue, estimatedDurationMs: 10 }
}

describe('Playwright JSON discovery', () => {
  it('parses every real case for both projects and keeps same-line cases distinct', () => {
    const cases = parseTestList(LIST_OUTPUT, 'functional')

    expect(cases).toHaveLength(6)
    expect(cases.every((testCase) => testCase.file === 'tests/e2e/web-routes.spec.ts')).toBe(true)
    expect(new Set(cases.map((testCase) => testCase.id)).size).toBe(6)

    const chromiumUnits = executionUnits(cases, 'functional', 'chromium')
    expect(chromiumUnits.map((value) => value.id)).toEqual([
      'tests/e2e/web-routes.spec.ts:11',
      'tests/e2e/web-routes.spec.ts:25'
    ])
    expect(chromiumUnits[0]?.cases).toHaveLength(2)
    expect(executionUnits(cases, 'functional', 'firefox')).toHaveLength(2)
  })

  it('fails closed on malformed or unexpected listing data', () => {
    expect(() => parseTestList('not json', 'functional')).toThrow(/invalid JSON/)
    expect(() => parseTestList('{}', 'functional')).toThrow(/no suites/)
    expect(() => parseTestList(JSON.stringify({ suites: [] }), 'functional')).toThrow(/No functional/)
    const unknownProject = JSON.stringify({
      suites: [
        {
          title: 'a.spec.ts',
          specs: [{ title: 't', file: 'a.spec.ts', line: 1, column: 1, tests: [{ projectName: 'webkit' }] }]
        }
      ]
    })
    expect(() => parseTestList(unknownProject, 'functional')).toThrow(/unknown project/)
    const malformed = JSON.stringify({
      suites: [{ title: 'a.spec.ts', specs: [{ title: 't', file: 'a.spec.ts', line: 0, column: 1, tests: [] }] }]
    })
    expect(() => parseTestList(malformed, 'functional')).toThrow(/malformed spec/)
  })
})

describe('E2E plan completeness', () => {
  const functional = unit('tests/e2e/a.spec.ts:1', 'functional', 'chromium', ['a-1'])
  const functionalSecond = unit('tests/e2e/b.spec.ts:2', 'functional', 'chromium', ['b-1'])
  const scope: E2ePlanScope = { category: 'functional', browser: 'chromium', units: [functional, functionalSecond] }

  it('accepts a plan that assigns every unit and case exactly once', () => {
    const groups = planGroups([planned(functional), planned(functionalSecond)], {
      category: 'functional',
      browser: 'chromium',
      groupCount: 2
    })

    expect(() => assertPlanComplete([scope], groups)).not.toThrow()
    expect(groups.flatMap((group) => group.units).flatMap((value) => value.cases)).toHaveLength(2)
  })

  it('rejects empty scopes, dropped units, duplicate units, and case-count drift', () => {
    expect(() => assertPlanComplete([{ ...scope, units: [] }], [])).toThrow(/no units discovered/)
    expect(() => assertPlanComplete([scope], [])).toThrow(/no groups planned/)
    const dropped = planGroups([planned(functional)], { category: 'functional', browser: 'chromium', groupCount: 1 })
    expect(() => assertPlanComplete([scope], dropped)).toThrow(/planned 1/)
    const withCase = unit('tests/e2e/a.spec.ts:1', 'functional', 'chromium', ['a-1', 'a-2'])
    const duplicate = planGroups([planned(withCase), planned(withCase)], {
      category: 'functional',
      browser: 'chromium',
      groupCount: 1
    })
    expect(() => assertPlanComplete([{ ...scope, units: [withCase] }], duplicate)).toThrow(/more than once/)
    const shrunk: E2eTestUnit = { ...withCase, cases: [{ id: 'a-1', titlePath: ['a'] }] }
    const shrunkGroups = planGroups([planned(shrunk)], { category: 'functional', browser: 'chromium', groupCount: 1 })
    expect(() => assertPlanComplete([{ ...scope, units: [withCase] }], shrunkGroups)).toThrow(/cases but planned 1/)
  })

  it('rejects a source location that mixes categories for the same browser', () => {
    const mixedFunctional: E2ePlanScope = {
      category: 'functional',
      browser: 'chromium',
      units: [unit('tests/e2e/mixed.spec.ts:1', 'functional', 'chromium', ['mixed-1'])]
    }
    const mixedPerformance: E2ePlanScope = {
      category: 'performance',
      browser: 'chromium',
      units: [unit('tests/e2e/mixed.spec.ts:1', 'performance', 'chromium', ['mixed-2'])]
    }

    expect(() => assertNoCategoryLeakage([mixedFunctional, mixedPerformance])).toThrow(
      /mixes functional and performance/
    )
    expect(() => assertNoCategoryLeakage([mixedFunctional])).not.toThrow()
  })
})
