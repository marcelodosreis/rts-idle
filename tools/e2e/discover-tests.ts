import { spawnSync } from 'node:child_process'
import type { E2eBrowser, E2eCategory } from './plan-types.js'

interface DiscoveredTest {
  readonly id: string
  readonly file: string
  readonly line: number
  readonly title: string
  readonly category: E2eCategory
  readonly browser: E2eBrowser
}

const TEST_LINE = /^\s*\[[^\]]+\]\s+›\s+(.+):(\d+):\d+\s+›\s+(.*)$/

export function discoverTests(category: E2eCategory, browser: E2eBrowser): readonly DiscoveredTest[] {
  const selector = category === 'performance' ? '--grep=@perf' : '--grep-invert=@perf'
  const result = spawnSync('pnpm', ['exec', 'playwright', 'test', '--list', `--project=${browser}`, selector], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })

  if (result.status !== 0) {
    const error = readText(result.stderr)
    throw new Error(`Playwright test discovery failed for ${category}/${browser}: ${error}`)
  }

  const tests = new Map<string, DiscoveredTest>()
  for (const line of readText(result.stdout).split('\n')) {
    const match = TEST_LINE.exec(line)
    if (match === null) {
      continue
    }
    const fileValue = match[1]
    const lineValue = match[2]
    const title = match[3]
    if (fileValue === undefined || lineValue === undefined || title === undefined) {
      continue
    }
    const file = normalizeSpecPath(fileValue)
    const lineNumber = Number(lineValue)
    if (!Number.isInteger(lineNumber)) {
      continue
    }
    const id = `${file}:${lineNumber}`
    if (!tests.has(id)) {
      tests.set(id, { id, file, line: lineNumber, title, category, browser })
    }
  }

  return [...tests.values()].sort((left, right) => left.id.localeCompare(right.id))
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

export type { DiscoveredTest }
