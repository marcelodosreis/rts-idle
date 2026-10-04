import {
  E2E_BROWSERS,
  E2E_CATEGORIES,
  type E2eBrowser,
  type E2eCategory,
  type E2eGroup,
  type E2ePlannedUnit,
  type E2eTestUnit
} from './plan-types.js'

const MIN_GROUPS = 2
const MAX_GROUPS = 4
const DEFAULT_DURATION_MS = 60_000

interface PlanOptions {
  readonly category: E2eCategory
  readonly browser: E2eBrowser
  readonly groupCount?: number
}

export interface E2ePlanScope {
  readonly category: E2eCategory
  readonly browser: E2eBrowser
  readonly units: readonly E2eTestUnit[]
}

interface MutableGroup {
  readonly id: string
  readonly category: E2eCategory
  readonly browser: E2eBrowser
  readonly units: E2ePlannedUnit[]
  estimatedDurationMs: number
}

/**
 * Rejects a source location discovered in both categories for the same
 * browser. Running a `file:line` selector executes every case at that
 * location, so a mixed location could leak `@perf` cases into the functional
 * lane (or the reverse); the planner refuses to certify it.
 */
export function assertNoCategoryLeakage(scopes: readonly E2ePlanScope[]): void {
  for (const browser of E2E_BROWSERS) {
    const byCategory = new Map<E2eCategory, Set<string>>()
    for (const category of E2E_CATEGORIES) {
      const scope = scopes.find((candidate) => candidate.category === category && candidate.browser === browser)
      byCategory.set(category, new Set((scope?.units ?? []).map((unit) => unit.id)))
    }
    for (const unitId of byCategory.get('functional') ?? []) {
      if (byCategory.get('performance')?.has(unitId)) {
        throw new Error(`E2E discovery: ${unitId} mixes functional and performance cases for ${browser}`)
      }
    }
  }
}

/**
 * Enforces the plan completeness contract over execution units: every required
 * scope has units, the plan assigns each unit exactly once, and the expanded
 * case counts agree, so every discovered Playwright case is executed exactly
 * once per browser/category scope.
 */
export function assertPlanComplete(scopes: readonly E2ePlanScope[], groups: readonly E2eGroup[]): void {
  for (const scope of scopes) {
    const label = `${scope.category}/${scope.browser}`
    if (scope.units.length === 0) {
      throw new Error(`E2E plan is incomplete: no units discovered for ${label}`)
    }
    const scopeGroups = groups.filter((group) => group.category === scope.category && group.browser === scope.browser)
    if (scopeGroups.length === 0) {
      throw new Error(`E2E plan is incomplete: no groups planned for ${label}`)
    }
    const planned = scopeGroups.flatMap((group) => group.units)
    const uniqueIds = new Set(planned.map((unit) => unit.id))
    if (uniqueIds.size !== planned.length) {
      throw new Error(`E2E plan is incomplete: a unit was assigned more than once in ${label}`)
    }
    const discoveredIds = new Set(scope.units.map((unit) => unit.id))
    if (uniqueIds.size !== discoveredIds.size || [...discoveredIds].some((id) => !uniqueIds.has(id))) {
      throw new Error(
        `E2E plan is incomplete: ${label} discovered ${discoveredIds.size} units but planned ${uniqueIds.size}`
      )
    }
    const discoveredCases = countCases(scope.units)
    const plannedCases = countCases(planned)
    if (plannedCases !== discoveredCases) {
      throw new Error(
        `E2E plan is incomplete: ${label} discovered ${discoveredCases} cases but planned ${plannedCases}`
      )
    }
  }
}

export function estimateDuration(durationMs: number | undefined): number {
  if (durationMs === undefined || !Number.isFinite(durationMs) || durationMs <= 0) {
    return DEFAULT_DURATION_MS
  }
  return Math.round(durationMs)
}

export function planGroups(units: readonly E2ePlannedUnit[], options: PlanOptions): readonly E2eGroup[] {
  const relevantUnits = units.filter((unit) => unit.category === options.category && unit.browser === options.browser)

  if (relevantUnits.length === 0) {
    return []
  }

  const groupCount = chooseGroupCount(relevantUnits, options)
  const groups = Array.from({ length: groupCount }, (_, index) => createGroup(options, index))

  for (const unit of sortByWeight(relevantUnits)) {
    const target = findLightestGroup(groups)
    target.units.push(unit)
    target.estimatedDurationMs += unit.estimatedDurationMs
  }

  return groups.map(({ units: groupUnits, ...group }) => ({
    ...group,
    units: [...groupUnits].sort((left, right) => left.id.localeCompare(right.id))
  }))
}

function countCases(units: readonly E2eTestUnit[]): number {
  return units.reduce((total, unit) => total + unit.cases.length, 0)
}

function chooseGroupCount(units: readonly E2ePlannedUnit[], options: PlanOptions): number {
  if (options.groupCount !== undefined) {
    return clampGroupCount(options.groupCount, units.length)
  }

  if (units.length < MIN_GROUPS) {
    return units.length
  }

  let selectedCount = MIN_GROUPS
  let selectedGroups = buildGroups(units, selectedCount, options.category, options.browser)
  for (const candidateCount of [3, 4]) {
    if (candidateCount > units.length) {
      break
    }
    const candidateGroups = buildGroups(units, candidateCount, options.category, options.browser)
    if (maximumDuration(candidateGroups) * 1.15 < maximumDuration(selectedGroups)) {
      selectedCount = candidateCount
      selectedGroups = candidateGroups
    }
  }
  return selectedCount
}

function clampGroupCount(requestedCount: number, testCount: number): number {
  const upperBound = Math.min(MAX_GROUPS, testCount)
  return Math.max(1, Math.min(upperBound, Math.max(MIN_GROUPS, requestedCount)))
}

function sortByWeight(units: readonly E2ePlannedUnit[]): E2ePlannedUnit[] {
  return [...units].sort((left, right) => {
    const durationDifference = right.estimatedDurationMs - left.estimatedDurationMs
    return durationDifference === 0 ? left.id.localeCompare(right.id) : durationDifference
  })
}

function createGroup(options: PlanOptions, index: number): MutableGroup {
  return {
    id: `${options.category}-${options.browser}-${index + 1}`,
    category: options.category,
    browser: options.browser,
    units: [],
    estimatedDurationMs: 0
  }
}

function findLightestGroup(groups: readonly MutableGroup[]): MutableGroup {
  const firstGroup = groups[0]
  if (firstGroup === undefined) {
    throw new Error('cannot plan a group without groups')
  }

  return groups.slice(1).reduce((lightest, group) => {
    if (group.estimatedDurationMs < lightest.estimatedDurationMs) {
      return group
    }
    if (group.estimatedDurationMs === lightest.estimatedDurationMs && group.id < lightest.id) {
      return group
    }
    return lightest
  }, firstGroup)
}

function buildGroups(
  units: readonly E2ePlannedUnit[],
  groupCount: number,
  category: E2eCategory,
  browser: E2eBrowser
): readonly MutableGroup[] {
  const groups = Array.from({ length: groupCount }, (_, index) => createGroup({ category, browser }, index))
  for (const unit of sortByWeight(units)) {
    const target = findLightestGroup(groups)
    target.units.push(unit)
    target.estimatedDurationMs += unit.estimatedDurationMs
  }
  return groups
}

function maximumDuration(groups: readonly MutableGroup[]): number {
  return groups.reduce((maximum, group) => Math.max(maximum, group.estimatedDurationMs), 0)
}
