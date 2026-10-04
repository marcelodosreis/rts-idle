import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const WORKSPACE_ROOT = process.cwd()
const E2E_ROOT = join(WORKSPACE_ROOT, 'tests/e2e')
const LITERAL_ANIMATION_ASSERTION = /getSpriteState\([^)]*\)\??\.anim[\s\S]{0,80}\.(?:toBe|toMatch)\s*\(/u
const LITERAL_FRAME_ASSERTION =
  /getAnimationFrame\([^)]*\)[\s\S]{0,80}\.(?:toBe|toEqual|toMatch)\s*\(\s*(?:['"`]\d|\d)/u

function specFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name)
    if (entry.isDirectory()) {
      return specFiles(file)
    }
    return entry.isFile() && entry.name.endsWith('.spec.ts') ? [file] : []
  })
}

function literalAnimationAssertions(): readonly string[] {
  return specFiles(E2E_ROOT)
    .filter((file) => {
      const source = readFileSync(file, 'utf8')
      return LITERAL_ANIMATION_ASSERTION.test(source) || LITERAL_FRAME_ASSERTION.test(source)
    })
    .map((file) => relative(WORKSPACE_ROOT, file))
}

describe('E2E animation conventions', () => {
  it('detects literal animation assertions in the convention matcher', () => {
    const source = "expect.poll(() => debug.getSpriteState(id)?.anim).toBe('run')"
    expect(LITERAL_ANIMATION_ASSERTION.test(source)).toBe(true)
  })

  it('requires browser animation assertions to use expectAnim', () => {
    expect(literalAnimationAssertions()).toEqual([])
  })
})
