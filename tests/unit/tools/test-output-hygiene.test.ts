import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const WORKSPACE_ROOT = process.cwd()

function readFile(path: string): string {
  return readFileSync(join(WORKSPACE_ROOT, path), 'utf-8')
}

describe('test output hygiene (QUAL-016)', () => {
  describe('playwright config', () => {
    const config = readFile('playwright.config.ts')

    it('does not use html reporter', () => {
      expect(config).not.toMatch(/reporter.*html/)
    })

    it('does not use trace on-first-retry', () => {
      expect(config).not.toMatch(/trace.*on-first-retry/)
    })

    it('does not use screenshot on failure', () => {
      expect(config).not.toMatch(/screenshot.*only-on-failure/)
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
