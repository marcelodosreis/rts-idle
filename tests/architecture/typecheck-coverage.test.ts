import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const TSC = resolve(ROOT, 'node_modules/typescript/bin/tsc')
const REPOSITORY_TSCONFIG = resolve(ROOT, 'tsconfig.repository.json')
const CODE_FILE_PATTERN = /\.(?:cjs|js|jsx|mjs|ts|tsx)$/
const GENERATED_FILES = new Set(['apps/web/src/shared/ui', 'tools/assets/src/catalog/curated.ts'])

function trackedCodeFiles(): readonly string[] {
  const output = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  return output
    .split('\n')
    .filter((file) => CODE_FILE_PATTERN.test(file) && !isExcluded(file))
    .sort()
}

function isExcluded(file: string): boolean {
  return [...GENERATED_FILES].some((excluded) => file === excluded || file.startsWith(`${excluded}/`))
}

function typecheckedFiles(): ReadonlySet<string> {
  const output = execFileSync(process.execPath, [TSC, '-p', REPOSITORY_TSCONFIG, '--noEmit', '--listFilesOnly'], {
    cwd: ROOT,
    encoding: 'utf8'
  })
  return new Set(
    output
      .split('\n')
      .map((file) => file.trim())
      .filter((file) => file.length > 0)
      .map((file) => (file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file))
  )
}

describe('repository typecheck coverage', () => {
  it('has a repository tsconfig', () => {
    expect(existsSync(REPOSITORY_TSCONFIG)).toBe(true)
  })

  it('typechecks every tracked code file outside approved generated files', () => {
    const checkedFiles = typecheckedFiles()
    const uncovered = trackedCodeFiles().filter((file) => !checkedFiles.has(file))
    expect(uncovered).toEqual([])
  }, 30_000)

  it('keeps the approved generated files explicit', () => {
    const config = readFileSync(REPOSITORY_TSCONFIG, 'utf8')
    for (const generatedFile of GENERATED_FILES) {
      expect(config).toContain(generatedFile)
    }
  })
})
