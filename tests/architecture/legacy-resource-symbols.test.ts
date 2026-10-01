import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Static guard for the unified Resource migration: the legacy mineral-node and
 * natural-resource domains were deleted and must not return as adapters,
 * aliases, deprecated fields, fallback reads, or dual write paths.
 *
 * The negative guards themselves live in `tests/architecture`, which is the
 * only directory allowed to name the removed symbols.
 */

const REPO_ROOT = process.cwd()
const SCAN_ROOTS = ['packages', 'apps', 'tools', 'tests'].map((dir) => join(REPO_ROOT, dir))
const EXCLUDED_DIRECTORY_NAMES = new Set(['node_modules', 'dist', 'test-results', 'playwright-report'])
const EXCLUDED_PATH_FRAGMENT = join('tests', 'architecture')

/** Removed identifiers that must never appear again in active code or tests. */
const FORBIDDEN_IDENTIFIERS = [
  'MineralNode',
  'SnapshotMineralNode',
  'RenderMineralNode',
  'mineralNode',
  'mineralNodes',
  'mineralNodeAt',
  'NaturalResource',
  'NaturalResourceId',
  'NaturalResourceDefinition',
  'NaturalResourceCatalog',
  'NaturalResourceState',
  'naturalResources',
  'getNaturalResources',
  'costMinerals',
  'NO_MINERALS',
  'selectMineral',
  'mineralCommand',
  'mineralRemainingLine',
  'setSelectedMineral',
  'selectedMineralId',
  'nodeMinerals',
  'nodeId'
] as const

/** Removed protocol tone and gather phases; only quoted literals are forbidden. */
const FORBIDDEN_LITERALS = ['TO_NODE', 'GATHERING', 'mining'] as const

function collectSourceFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (!EXCLUDED_DIRECTORY_NAMES.has(entry)) {
        collectSourceFiles(full, out)
      }
      continue
    }
    if ((entry.endsWith('.ts') || entry.endsWith('.tsx')) && !entry.endsWith('.d.ts')) {
      out.push(full)
    }
  }
}

function isExcluded(path: string): boolean {
  return path.includes(EXCLUDED_PATH_FRAGMENT)
}

function collectViolations(source: string): string[] {
  const violations: string[] = []
  for (const identifier of FORBIDDEN_IDENTIFIERS) {
    if (new RegExp(`\\b${identifier}\\b`).test(source)) {
      violations.push(identifier)
    }
  }
  for (const literal of FORBIDDEN_LITERALS) {
    if (new RegExp(`['"\`]${literal}['"\`]`).test(source)) {
      violations.push(`'${literal}'`)
    }
  }
  return violations
}

describe('legacy resource symbols are gone', () => {
  it('no package, app, tool, or test reintroduces the removed mineral domain', () => {
    const files: string[] = []
    for (const root of SCAN_ROOTS) {
      for (const entry of readdirSync(root)) {
        const candidate = join(root, entry)
        if (statSync(candidate).isDirectory()) {
          collectSourceFiles(candidate, files)
        }
      }
    }

    const failures: string[] = []
    for (const file of files) {
      if (isExcluded(file)) {
        continue
      }
      const violations = collectViolations(readFileSync(file, 'utf8'))
      if (violations.length > 0) {
        failures.push(`${relative(REPO_ROOT, file)}: ${violations.join(', ')}`)
      }
    }

    expect(failures).toEqual([])
  })
})
