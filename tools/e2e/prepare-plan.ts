import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { discoverTestCases, executionUnits } from './discover-tests.js'
import { E2E_BROWSERS, E2E_CATEGORIES, type E2eCategory, type E2ePlan, type E2eTestCase } from './plan-types.js'
import { assertNoCategoryLeakage, assertPlanComplete, type E2ePlanScope, planGroups } from './planner.js'
import { estimateUnits, readTimingHistory } from './timing-history.js'

const outputPath = readOption('--output') ?? 'tmp/e2e-plan.json'
const historyPath = readOption('--history')
const history = readTimingHistory(historyPath === undefined || !existsSync(historyPath) ? null : readJson(historyPath))

const casesByCategory = new Map<E2eCategory, readonly E2eTestCase[]>(
  E2E_CATEGORIES.map((category) => [category, discoverTestCases(category)])
)
const scopes: readonly E2ePlanScope[] = E2E_CATEGORIES.flatMap((category) =>
  E2E_BROWSERS.map((browser) => ({
    category,
    browser,
    units: executionUnits(casesFor(casesByCategory, category), category, browser)
  }))
)
assertNoCategoryLeakage(scopes)

const plannedScopes = scopes.map((scope) => ({
  ...scope,
  units: estimateUnits(scope.units, history)
}))
const groups = plannedScopes.flatMap((scope) =>
  planGroups(scope.units, { category: scope.category, browser: scope.browser })
)
assertPlanComplete(plannedScopes, groups)

const plan: E2ePlan = { version: 2, generatedAt: new Date().toISOString(), groups }
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8')

function casesFor(
  byCategory: ReadonlyMap<E2eCategory, readonly E2eTestCase[]>,
  category: E2eCategory
): readonly E2eTestCase[] {
  const cases = byCategory.get(category)
  if (cases === undefined) {
    throw new Error(`E2E plan is incomplete: no discovery for ${category}`)
  }
  return cases
}

function readOption(name: string): string | undefined {
  const prefix = `${name}=`
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix))
  return argument?.slice(prefix.length)
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}
