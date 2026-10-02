import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import type { E2eBrowser, E2eCategory, E2eTiming } from './plan-types.js'

export default class E2eTimingReporter implements Reporter {
  private readonly timings = new Map<string, E2eTiming>()

  onTestEnd(test: TestCase, result: TestResult): void {
    const timing = this.createTiming(test, result)
    const previous = this.timings.get(timing.id)
    this.timings.set(timing.id, previous === undefined ? timing : mergeTiming(previous, timing))
  }

  onEnd(_result: FullResult): void {
    const outputPath = readEnvironmentValue('E2E_TIMINGS_FILE')
    if (outputPath === undefined) {
      return
    }
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(
      outputPath,
      `${JSON.stringify({ version: 1, timings: [...this.timings.values()] }, null, 2)}\n`,
      'utf8'
    )
  }

  private createTiming(test: TestCase, result: TestResult): E2eTiming {
    const category = readCategory(readEnvironmentValue('E2E_CATEGORY'))
    const browser = readBrowser(readEnvironmentValue('E2E_BROWSER'))
    const file = relative(process.cwd(), test.location.file).replaceAll('\\', '/')
    return {
      id: `${file}:${test.location.line}`,
      category,
      browser,
      durationMs: result.duration,
      status: result.status
    }
  }
}

function mergeTiming(previous: E2eTiming, current: E2eTiming): E2eTiming {
  return {
    ...current,
    durationMs: previous.durationMs + current.durationMs,
    status: previous.status === 'failed' || current.status === 'failed' ? 'failed' : current.status
  }
}

function readCategory(value: string | undefined): E2eCategory {
  if (value !== 'functional' && value !== 'performance') {
    throw new Error(`invalid E2E category: ${value ?? '<missing>'}`)
  }
  return value
}

function readBrowser(value: string | undefined): E2eBrowser {
  if (value !== 'chromium' && value !== 'firefox') {
    throw new Error(`invalid E2E browser: ${value ?? '<missing>'}`)
  }
  return value
}

function readEnvironmentValue(name: string): string | undefined {
  return process.env[name]
}
