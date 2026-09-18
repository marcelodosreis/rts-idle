import { describe, expect, it } from 'vitest'
import { hasExplicitE2eScope } from '../../tools/e2e-scope.js'

const existingSpec = (argument: string): boolean => argument.endsWith('.spec.ts')

describe('E2E scope guard', () => {
  it('rejects an unscoped invocation', () => {
    expect(hasExplicitE2eScope([], existingSpec)).toBe(false)
  })

  it('accepts a spec file, grep, and project selectors', () => {
    expect(hasExplicitE2eScope(['tests/e2e/economy.spec.ts'], existingSpec)).toBe(true)
    expect(hasExplicitE2eScope(['--grep', 'economy'], existingSpec)).toBe(true)
    expect(hasExplicitE2eScope(['--project=chromium'], existingSpec)).toBe(true)
  })

  it('ignores the pnpm argument separator before checking selectors', () => {
    expect(hasExplicitE2eScope(['--', '--project=chromium'], existingSpec)).toBe(true)
  })
})
