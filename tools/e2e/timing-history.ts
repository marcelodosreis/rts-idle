import type { E2eBrowser, E2eCategory, E2ePlannedUnit, E2eTestUnit, E2eTiming, E2eTimingHistory } from './plan-types.js'
import { estimateDuration } from './planner.js'

const HISTORY_VERSION = 1

export function readTimingHistory(value: unknown): E2eTimingHistory {
  const version = isRecord(value) ? readField(value, 'version') : undefined
  const timings = isRecord(value) ? readField(value, 'timings') : undefined
  if (version !== HISTORY_VERSION || !Array.isArray(timings)) {
    return { version: HISTORY_VERSION, timings: [] }
  }

  return { version: HISTORY_VERSION, timings: timings.filter(isTiming) }
}

export function estimateUnits(units: readonly E2eTestUnit[], history: E2eTimingHistory): readonly E2ePlannedUnit[] {
  return units.map((unit) => {
    const timing = history.timings.find(
      (candidate) =>
        candidate.id === unit.id && candidate.category === unit.category && candidate.browser === unit.browser
    )
    return { ...unit, estimatedDurationMs: estimateDuration(timing?.durationMs) }
  })
}

export function mergeTimings(values: readonly unknown[]): E2eTimingHistory {
  const timings = values.flatMap((value) => readTimingHistory(value).timings)
  const latest = new Map<string, E2eTiming>()

  for (const timing of timings) {
    latest.set(timingKey(timing), timing)
  }

  return {
    version: HISTORY_VERSION,
    timings: [...latest.values()].sort((left, right) => timingKey(left).localeCompare(timingKey(right)))
  }
}

function timingKey(timing: E2eTiming): string {
  return `${timing.category}:${timing.browser}:${timing.id}`
}

function isTiming(value: unknown): value is E2eTiming {
  if (!isRecord(value)) {
    return false
  }
  const id = readField(value, 'id')
  const category = readField(value, 'category')
  const browser = readField(value, 'browser')
  const durationMs = readField(value, 'durationMs')
  const status = readField(value, 'status')
  return (
    typeof id === 'string' &&
    isCategory(category) &&
    isBrowser(browser) &&
    typeof durationMs === 'number' &&
    Number.isFinite(durationMs) &&
    durationMs > 0 &&
    typeof status === 'string'
  )
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

function isRecord(value: unknown): value is UnknownObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readField(object: UnknownObject, key: string): unknown {
  return object[key]
}
