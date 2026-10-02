import { readdirSync, readFileSync } from 'node:fs'
import { basename, extname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const WEB_SOURCE = resolve('apps/web/src')
const GENERATED_UI = join(WEB_SOURCE, 'shared/ui')
const FEATURE_SLICES = [
  'features/match',
  'features/laboratory/shared',
  'features/laboratory/browser',
  'features/laboratory/diagnostics',
  'features/laboratory/editor',
  'features/laboratory/report'
] as const
const EXEMPT_FILENAMES = new Set(['vite-env.d'])

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name)
    if (entry.isDirectory()) {
      return sourceFiles(file)
    }
    return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [file] : []
  })
}

function isGenerated(file: string): boolean {
  return file.startsWith(GENERATED_UI)
}

function stem(file: string): string {
  return basename(file, extname(file))
}

function componentExports(source: string): number {
  return [...source.matchAll(/^export function [A-Z]/gm)].length
}

function pageFeatureImports(): readonly string[] {
  return sourceFiles(join(WEB_SOURCE, 'pages'))
    .flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/from ['"](@\/features\/[^'"]+)['"]/g)])
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined)
}

describe('web file conventions', () => {
  it('uses kebab-case source filenames outside generated UI', () => {
    const violations = sourceFiles(WEB_SOURCE)
      .filter((file) => !isGenerated(file))
      .filter((file) => !EXEMPT_FILENAMES.has(stem(file)))
      .map((file) => relative(WEB_SOURCE, file))
      .filter((file) => !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.(?:ts|tsx))$/.test(file.split('/').at(-1) ?? ''))
    expect(violations).toEqual([])
  })

  it('keeps one exported React component per non-generated file', () => {
    const violations = sourceFiles(WEB_SOURCE)
      .filter((file) => file.endsWith('.tsx') && !isGenerated(file))
      .filter((file) => componentExports(readFileSync(file, 'utf8')) > 1)
      .map((file) => relative(WEB_SOURCE, file))
    expect(violations).toEqual([])
  })

  it('keeps the unit selection card component private to its file', () => {
    const source = readFileSync(join(WEB_SOURCE, 'features/match/components/unit-selection-card.tsx'), 'utf8')
    expect(componentExports(source)).toBe(1)
  })

  it('exposes every feature slice with an explicit barrel and no model segment', () => {
    const missingBarrels = FEATURE_SLICES.filter((slice) => {
      try {
        readFileSync(join(WEB_SOURCE, slice, 'index.ts'))
        return false
      } catch {
        return true
      }
    })
    const modelFiles = sourceFiles(join(WEB_SOURCE, 'features')).filter((file) => file.includes('/model/'))
    expect(missingBarrels).toEqual([])
    expect(modelFiles).toEqual([])
  })

  it('keeps pages on feature public APIs', () => {
    const deepImports = pageFeatureImports().filter((specifier) => specifier.split('/').length > 4)
    expect(deepImports).toEqual([])
  })
})
