import { readFileSync } from 'node:fs'
import {
  E2E_BROWSERS,
  E2E_CATEGORIES,
  type E2eBrowser,
  type E2eCategory,
  type E2eGroup,
  type E2ePlan
} from './plan-types.js'

export function readPlan(path: string): E2ePlan {
  const value = parsePlanFile(path)
  if (!isPlan(value)) {
    throw new Error(`invalid E2E plan: ${path}`)
  }
  assertRequiredScopes(value)
  assertUnitAssignments(value)
  return value
}

/**
 * Selects one group for execution and refuses any mismatch between the
 * artifact and the requested browser; the category grep is derived from the
 * validated group itself, so a tampered artifact cannot leak cases across
 * lanes.
 */
export function selectGroup(plan: E2ePlan, groupId: string, browser: E2eBrowser): E2eGroup {
  const group = plan.groups.find((candidate) => candidate.id === groupId)
  if (group === undefined) {
    throw new Error(`E2E group not found: ${groupId}`)
  }
  if (group.browser !== browser) {
    throw new Error(`E2E group ${groupId} targets ${group.browser}, not ${browser}`)
  }
  return group
}

function parsePlanFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`invalid E2E plan: ${path} (${error instanceof Error ? error.message : String(error)})`)
  }
}

function assertRequiredScopes(plan: E2ePlan): void {
  for (const category of E2E_CATEGORIES) {
    for (const browser of E2E_BROWSERS) {
      if (!plan.groups.some((group) => group.category === category && group.browser === browser)) {
        throw new Error(`invalid E2E plan: missing ${category}/${browser} groups`)
      }
    }
  }
}

function assertUnitAssignments(plan: E2ePlan): void {
  for (const category of E2E_CATEGORIES) {
    for (const browser of E2E_BROWSERS) {
      const scoped = plan.groups.filter((group) => group.category === category && group.browser === browser)
      const units = scoped.flatMap((group) => group.units)
      const unique = new Set(units.map((unit) => unit.id))
      if (unique.size !== units.length) {
        throw new Error(`invalid E2E plan: duplicate unit assignment in ${category}/${browser}`)
      }
    }
  }
  for (const browser of E2E_BROWSERS) {
    assertNoPlanCategoryLeakage(plan, browser)
  }
}

function assertNoPlanCategoryLeakage(plan: E2ePlan, browser: E2eBrowser): void {
  const functional = new Set(unitIds(plan, 'functional', browser))
  for (const unitId of unitIds(plan, 'performance', browser)) {
    if (functional.has(unitId)) {
      throw new Error(`invalid E2E plan: ${unitId} is assigned to both lanes for ${browser}`)
    }
  }
}

function unitIds(plan: E2ePlan, category: E2eCategory, browser: E2eBrowser): readonly string[] {
  return plan.groups
    .filter((group) => group.category === category && group.browser === browser)
    .flatMap((group) => group.units.map((unit) => unit.id))
}

function isPlan(value: unknown): value is E2ePlan {
  const record = asRecord(value)
  if (record === null || readField(record, 'version') !== 2) {
    return false
  }
  if (typeof readField(record, 'generatedAt') !== 'string') {
    return false
  }
  const groups = readField(record, 'groups')
  if (!Array.isArray(groups) || groups.length === 0) {
    return false
  }
  const ids = new Set<string>()
  for (const group of groups) {
    if (!isGroup(group)) {
      return false
    }
    ids.add(group.id)
  }
  return ids.size === groups.length
}

function isGroup(value: unknown): value is E2eGroup {
  const record = asRecord(value)
  if (record === null) {
    return false
  }
  const id = readField(record, 'id')
  const category = readField(record, 'category')
  const browser = readField(record, 'browser')
  const units = readField(record, 'units')
  if (
    typeof id !== 'string' ||
    !isCategory(category) ||
    !isBrowser(browser) ||
    !id.startsWith(`${category}-${browser}-`) ||
    !isPositiveDuration(readField(record, 'estimatedDurationMs')) ||
    !Array.isArray(units) ||
    units.length === 0
  ) {
    return false
  }
  return units.every((unit) => isUnit(unit, category, browser))
}

function isUnit(value: unknown, category: E2eCategory, browser: E2eBrowser): boolean {
  const record = asRecord(value)
  if (record === null) {
    return false
  }
  const id = readField(record, 'id')
  const file = readField(record, 'file')
  const line = readField(record, 'line')
  const cases = readField(record, 'cases')
  if (
    typeof id !== 'string' ||
    typeof file !== 'string' ||
    typeof line !== 'number' ||
    !Number.isInteger(line) ||
    line <= 0 ||
    readField(record, 'category') !== category ||
    readField(record, 'browser') !== browser ||
    !isPositiveDuration(readField(record, 'estimatedDurationMs')) ||
    !Array.isArray(cases) ||
    cases.length === 0
  ) {
    return false
  }
  return id === `${file}:${line}` && cases.every(isCaseRef)
}

function isCaseRef(value: unknown): boolean {
  const record = asRecord(value)
  if (record === null) {
    return false
  }
  const titlePath = readField(record, 'titlePath')
  return typeof readField(record, 'id') === 'string' && Array.isArray(titlePath) && titlePath.every(isString)
}

function isPositiveDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isCategory(value: unknown): value is E2eCategory {
  return value === 'functional' || value === 'performance'
}

function isBrowser(value: unknown): value is E2eBrowser {
  return value === 'chromium' || value === 'firefox'
}

interface UnknownObject {
  readonly [key: string]: unknown
}

function asRecord(value: unknown): UnknownObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as UnknownObject) : null
}

function readField(record: UnknownObject, key: string): unknown {
  return record[key]
}
