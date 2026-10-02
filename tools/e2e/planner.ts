import type { E2eBrowser, E2eCategory, E2eGroup, E2eTestCase } from './plan-types.js'

const MIN_GROUPS = 2
const MAX_GROUPS = 4
const DEFAULT_DURATION_MS = 60_000

interface PlanOptions {
  readonly category: E2eCategory
  readonly browser: E2eBrowser
  readonly groupCount?: number
}

export function estimateDuration(durationMs: number | undefined): number {
  if (durationMs === undefined || !Number.isFinite(durationMs) || durationMs <= 0) {
    return DEFAULT_DURATION_MS
  }
  return Math.round(durationMs)
}

export function planGroups(tests: readonly E2eTestCase[], options: PlanOptions): readonly E2eGroup[] {
  const relevantTests = tests
    .filter((test) => test.category === options.category && test.browser === options.browser)
    .map((test) => ({ ...test, estimatedDurationMs: estimateDuration(test.estimatedDurationMs) }))

  if (relevantTests.length === 0) {
    return []
  }

  const groupCount = chooseGroupCount(relevantTests, options)
  const groups = Array.from({ length: groupCount }, (_, index) => createGroup(options, index))

  for (const test of sortByWeight(relevantTests)) {
    const target = findLightestGroup(groups)
    target.tests.push(test)
    target.estimatedDurationMs += test.estimatedDurationMs
  }

  return groups.map(({ tests: groupTests, ...group }) => ({
    ...group,
    tests: [...groupTests].sort((left, right) => left.id.localeCompare(right.id))
  }))
}

function chooseGroupCount(tests: readonly E2eTestCase[], options: PlanOptions): number {
  if (options.groupCount !== undefined) {
    return clampGroupCount(options.groupCount, tests.length)
  }

  if (tests.length < MIN_GROUPS) {
    return tests.length
  }

  let selectedCount = MIN_GROUPS
  let selectedGroups = buildGroups(tests, selectedCount, options.category, options.browser)
  for (const candidateCount of [3, 4]) {
    if (candidateCount > tests.length) {
      break
    }
    const candidateGroups = buildGroups(tests, candidateCount, options.category, options.browser)
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

function sortByWeight(tests: readonly E2eTestCase[]): E2eTestCase[] {
  return [...tests].sort((left, right) => {
    const durationDifference = right.estimatedDurationMs - left.estimatedDurationMs
    return durationDifference === 0 ? left.id.localeCompare(right.id) : durationDifference
  })
}

interface MutableGroup {
  readonly id: string
  readonly category: E2eCategory
  readonly browser: E2eBrowser
  readonly tests: E2eTestCase[]
  estimatedDurationMs: number
}

function createGroup(options: PlanOptions, index: number): MutableGroup {
  return {
    id: `${options.category}-${options.browser}-${index + 1}`,
    category: options.category,
    browser: options.browser,
    tests: [],
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
  tests: readonly E2eTestCase[],
  groupCount: number,
  category: E2eCategory,
  browser: E2eBrowser
): readonly MutableGroup[] {
  const groups = Array.from({ length: groupCount }, (_, index) => createGroup({ category, browser }, index))
  for (const test of sortByWeight(tests)) {
    const target = findLightestGroup(groups)
    target.tests.push(test)
    target.estimatedDurationMs += test.estimatedDurationMs
  }
  return groups
}

function maximumDuration(groups: readonly MutableGroup[]): number {
  return groups.reduce((maximum, group) => Math.max(maximum, group.estimatedDurationMs), 0)
}
