export const E2E_CATEGORIES = ['functional', 'performance'] as const
export type E2eCategory = (typeof E2E_CATEGORIES)[number]

export const E2E_BROWSERS = ['chromium', 'firefox'] as const
export type E2eBrowser = (typeof E2E_BROWSERS)[number]

/** One real Playwright test case with structured identity. */
export interface E2eTestCase {
  readonly id: string
  readonly file: string
  readonly line: number
  readonly column: number
  readonly titlePath: readonly string[]
  readonly category: E2eCategory
  readonly browser: E2eBrowser
}

/** Case identity stored inside an execution unit in the plan artifact. */
export interface E2eCaseRef {
  readonly id: string
  readonly titlePath: readonly string[]
}

/**
 * One Playwright execution selector (`file:line`). Running the selector runs
 * every case it contains, so all cases of a unit must share one category and
 * one browser.
 */
export interface E2eTestUnit {
  readonly id: string
  readonly file: string
  readonly line: number
  readonly cases: readonly E2eCaseRef[]
  readonly category: E2eCategory
  readonly browser: E2eBrowser
}

export interface E2ePlannedUnit extends E2eTestUnit {
  readonly estimatedDurationMs: number
}

export interface E2eGroup {
  readonly id: string
  readonly category: E2eCategory
  readonly browser: E2eBrowser
  readonly units: readonly E2ePlannedUnit[]
  readonly estimatedDurationMs: number
}

export interface E2ePlan {
  readonly version: 2
  readonly generatedAt: string
  readonly groups: readonly E2eGroup[]
}

export interface E2eTiming {
  readonly id: string
  readonly category: E2eCategory
  readonly browser: E2eBrowser
  readonly durationMs: number
  readonly status: string
}

export interface E2eTimingHistory {
  readonly version: 1
  readonly timings: readonly E2eTiming[]
}
