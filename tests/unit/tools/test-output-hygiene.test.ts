import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const WORKSPACE_ROOT = process.cwd()

function readFile(path: string): string {
  return readFileSync(join(WORKSPACE_ROOT, path), 'utf-8')
}

describe('test output hygiene (QH.26.01)', () => {
  describe('playwright config', () => {
    const config = readFile('playwright.config.ts')

    it('does not use html reporter', () => {
      expect(config).not.toMatch(/reporter.*html/)
    })

    it('retains the trace of a failure in CI', () => {
      expect(config).toMatch(/trace: process\.env\.CI === 'true' \? 'retain-on-failure' : 'off'/)
    })

    it('runs without retries so a flake cannot hide', () => {
      expect(config).toMatch(/retries: 0/)
    })

    it('reduces motion so layout assertions are settled', () => {
      expect(config).toMatch(/reducedMotion: 'reduce'/)
    })

    it('captures screenshots only on failure in CI', () => {
      expect(config).toMatch(/screenshot: process\.env\.CI === 'true' \? 'only-on-failure' : 'off'/)
    })

    it('fails CI when a test passes only after retry', () => {
      expect(config).toMatch(/failOnFlakyTests: process\.env\.CI === 'true'/)
    })

    it('does not use video on first-retry', () => {
      expect(config).not.toMatch(/video.*on-first-retry/)
    })

    it('uses the compact dot reporter', () => {
      expect(config).toMatch(/reporter:.*dot/)
    })

    it('suppresses normal web server output', () => {
      expect(config).toMatch(/stdout:.*ignore/)
      expect(config).toMatch(/stderr:.*pipe/)
    })
  })

  describe('vitest config', () => {
    const config = readFile('vitest.config.ts')

    it('does not use text coverage reporter', () => {
      expect(config).not.toMatch(/reporter:\s*\[.*['"]text['"]/)
    })

    it('does not use html coverage reporter', () => {
      expect(config).not.toMatch(/reporter:\s*\[.*['"]html['"]/)
    })

    it('uses the compact dot reporter', () => {
      expect(config).toMatch(/reporters:\s*\[\s*['"]dot['"]\s*\]/)
    })
  })

  describe('package.json scripts', () => {
    const pkg = readFile('package.json')

    it('does not use --coverage flag with text reporter', () => {
      expect(pkg).not.toMatch(/--coverage.*--reporter.*text/)
    })
  })
})
