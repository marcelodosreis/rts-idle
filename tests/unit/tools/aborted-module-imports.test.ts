import { describe, expect, it } from 'vitest'
import { isAbortedModuleImportError } from '../../e2e/support/aborted-module-imports.js'

const DEV_URL = 'http://localhost:5173/node_modules/.vite/deps/pixi__js.js?v=abc123'

function evidence(attempted: readonly string[], failed: readonly string[] = []) {
  return { attempted: new Set(attempted), failed: new Set(failed) }
}

describe('aborted module import predicate', () => {
  it('ignores the known aborted Vite artifact for both browser phrasings', () => {
    expect(
      isAbortedModuleImportError(
        `TypeError: Failed to fetch dynamically imported module: ${DEV_URL}`,
        evidence([DEV_URL])
      )
    ).toBe(true)
    expect(
      isAbortedModuleImportError(`error loading dynamically imported module: ${DEV_URL}`, evidence([DEV_URL]))
    ).toBe(true)
  })

  it('fails generic dynamic import errors without observed request evidence', () => {
    expect(
      isAbortedModuleImportError(
        'TypeError: Failed to fetch dynamically imported module: http://localhost:5173/src/features/broken.tsx',
        evidence([DEV_URL])
      )
    ).toBe(false)
    expect(
      isAbortedModuleImportError('TypeError: Failed to fetch dynamically imported module: undefined', evidence([]))
    ).toBe(false)
  })

  it('fails a different chunk URL even when another import was aborted', () => {
    expect(
      isAbortedModuleImportError(
        'Failed to fetch dynamically imported module: http://localhost:5173/src/features/missing-chunk.tsx',
        evidence([DEV_URL])
      )
    ).toBe(false)
  })

  it('never ignores a module that produced an explicit failure', () => {
    expect(
      isAbortedModuleImportError(
        `Failed to fetch dynamically imported module: ${DEV_URL}`,
        evidence([DEV_URL], [DEV_URL])
      )
    ).toBe(false)
  })

  it('does not ignore non-import errors', () => {
    expect(isAbortedModuleImportError(`PixiRenderer: not mounted at ${DEV_URL}`, evidence([DEV_URL]))).toBe(false)
    expect(isAbortedModuleImportError('TypeError: Failed to fetch', evidence([DEV_URL]))).toBe(false)
  })
})
