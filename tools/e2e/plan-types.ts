export const E2E_CATEGORIES = ['functional', 'performance'] as const
export type E2eCategory = (typeof E2E_CATEGORIES)[number]

export const E2E_BROWSERS = ['chromium', 'firefox'] as const
export type E2eBrowser = (typeof E2E_BROWSERS)[number]

export interface E2eTestCase {
  readonly id: string
  readonly file: string
  readonly line: number
  readonly title: string
  readonly category: E2eCategory
  readonly browser: E2eBrowser
  readonly estimatedDurationMs: number
}

export interface E2eGroup {
  readonly id: string
  readonly category: E2eCategory
  readonly browser: E2eBrowser
  readonly tests: readonly E2eTestCase[]
  readonly estimatedDurationMs: number
}

export interface E2ePlan {
  readonly version: 1
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
