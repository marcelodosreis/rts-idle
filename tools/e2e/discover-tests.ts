import { spawnSync } from 'node:child_process'
import {
  E2E_BROWSERS,
  type E2eBrowser,
  type E2eCaseRef,
  type E2eCategory,
  type E2eTestCase,
  type E2eTestUnit
} from './plan-types.js'

interface UnknownRecord {
  readonly [key: string]: unknown
}

/**
 * Parses `playwright test --list --reporter=json` into real test cases. The
 * listing is a structured contract: every spec exposes its file/line/column,
 * each configured project contributes one case, and every unexpected shape
 * fails closed instead of silently dropping cases.
 */
export function parseTestList(output: string, category: E2eCategory): readonly E2eTestCase[] {
  const parsed = parseJson(output, category)
  const suites = readArray(parsed, 'suites')
  if (suites === null) {
    throw new Error(`Playwright --list JSON has no suites array for ${category}`)
  }
  const cases: E2eTestCase[] = []
  for (const suite of suites) {
    collectSuite(suite, category, [], cases)
  }
  if (cases.length === 0) {
    throw new Error(`No ${category} browser test cases were discovered`)
  }
  return cases
}

export function discoverTestCases(category: E2eCategory): readonly E2eTestCase[] {
  const selector = category === 'performance' ? '--grep=@perf' : '--grep-invert=@perf'
  const result = spawnSync('pnpm', ['exec', 'playwright', 'test', '--list', '--reporter=json', selector], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
  if (result.status !== 0) {
    const error = readText(result.stderr)
    throw new Error(`Playwright test discovery failed for ${category}: ${error}`)
  }
  return parseTestList(readText(result.stdout), category)
}

/**
 * Groups cases into execution units. A unit is the `file:line` selector the
 * runner can pass to Playwright; running it runs every case it contains, so all
 * cases of a unit must share the same category and browser.
 */
export function executionUnits(
  cases: readonly E2eTestCase[],
  category: E2eCategory,
  browser: E2eBrowser
): readonly E2eTestUnit[] {
  const grouped = new Map<string, E2eTestCase[]>()
  for (const testCase of cases) {
    if (testCase.category !== category || testCase.browser !== browser) {
      continue
    }
    const id = `${testCase.file}:${testCase.line}`
    grouped.set(id, [...(grouped.get(id) ?? []), testCase])
  }
  return [...grouped.entries()].map(([id, unitCases]) => toUnit(id, unitCases, category, browser)).sort(byUnitId)
}

function toUnit(
  id: string,
  unitCases: readonly E2eTestCase[],
  category: E2eCategory,
  browser: E2eBrowser
): E2eTestUnit {
  const first = unitCases[0]
  if (first === undefined) {
    throw new Error(`execution unit without cases: ${id}`)
  }
  const cases: E2eCaseRef[] = unitCases
    .map((testCase) => ({ id: testCase.id, titlePath: testCase.titlePath }))
    .sort(compareCaseRefs)
  return { id, file: first.file, line: first.line, cases, category, browser }
}

function byUnitId(left: E2eTestUnit, right: E2eTestUnit): number {
  return left.id.localeCompare(right.id)
}

function compareCaseRefs(left: E2eCaseRef, right: E2eCaseRef): number {
  return left.id.localeCompare(right.id)
}

function collectSuite(value: unknown, category: E2eCategory, ancestors: readonly string[], cases: E2eTestCase[]): void {
  const suite = asRecord(value)
  if (suite === null) {
    throw new Error(`Playwright --list JSON contains a non-object suite for ${category}`)
  }
  const title = readField(suite, 'title')
  const suiteTitle = typeof title === 'string' ? title : ''
  const nestedAncestors = suiteTitle === '' ? ancestors : [...ancestors, suiteTitle]
  for (const spec of readArray(suite, 'specs') ?? []) {
    collectSpec(spec, category, nestedAncestors, cases)
  }
  for (const nested of readArray(suite, 'suites') ?? []) {
    collectSuite(nested, category, nestedAncestors, cases)
  }
}

function collectSpec(value: unknown, category: E2eCategory, ancestors: readonly string[], cases: E2eTestCase[]): void {
  const spec = asRecord(value)
  if (spec === null) {
    throw new Error(`Playwright --list JSON contains a non-object spec for ${category}`)
  }
  const file = readField(spec, 'file')
  const line = readField(spec, 'line')
  const column = readField(spec, 'column')
  const title = readField(spec, 'title')
  if (
    typeof file !== 'string' ||
    typeof line !== 'number' ||
    !Number.isInteger(line) ||
    line < 1 ||
    typeof column !== 'number' ||
    !Number.isInteger(column) ||
    column < 0 ||
    typeof title !== 'string'
  ) {
    throw new Error(`Playwright --list JSON contains a malformed spec for ${category}`)
  }
  const tests = readArray(spec, 'tests')
  if (tests === null) {
    throw new Error(`Playwright --list JSON contains a spec without tests for ${category}`)
  }
  const normalizedFile = normalizeSpecPath(file)
  const titlePath = [...ancestors, title]
  const rawSpecId = readField(spec, 'id')
  const specId =
    typeof rawSpecId === 'string' ? rawSpecId : `${normalizedFile}:${line}:${column}:${titlePath.join(' › ')}`
  for (const test of tests) {
    const testRecord = asRecord(test)
    const projectName = testRecord === null ? undefined : readField(testRecord, 'projectName')
    if (!isBrowser(projectName)) {
      throw new Error(`Playwright --list JSON has an unknown project ${String(projectName)} for ${category}`)
    }
    cases.push({
      id: `${specId}:${projectName}`,
      file: normalizedFile,
      line,
      column,
      titlePath,
      category,
      browser: projectName
    })
  }
}

function parseJson(output: string, category: E2eCategory): UnknownRecord {
  let parsed: unknown
  try {
    parsed = JSON.parse(output)
  } catch {
    throw new Error(`Playwright --list produced invalid JSON for ${category}`)
  }
  const record = asRecord(parsed)
  if (record === null) {
    throw new Error(`Playwright --list produced a non-object for ${category}`)
  }
  return record
}

function readArray(record: UnknownRecord, key: string): readonly unknown[] | null {
  const value = record[key]
  return Array.isArray(value) ? value : null
}

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as UnknownRecord) : null
}

function readField(record: UnknownRecord, key: string): unknown {
  return record[key]
}

function isBrowser(value: unknown): value is E2eBrowser {
  return typeof value === 'string' && (E2E_BROWSERS as readonly string[]).includes(value)
}

function normalizeSpecPath(file: string): string {
  const normalized = file.replaceAll('\\', '/')
  return normalized.startsWith('tests/e2e/') ? normalized : `tests/e2e/${normalized}`
}

function readText(value: string | Buffer | null): string {
  if (value === null) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  return value.toString('utf8')
}
