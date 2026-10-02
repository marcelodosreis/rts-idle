import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const SOURCE_ROOTS = [join(ROOT, 'packages/simulation/src'), join(ROOT, 'apps/server/src')]

const GLOBAL_ITERATION_ALLOWLIST = new Map<string, string>([
  ['packages/simulation/src/snapshot/serialize.ts', 'canonical entity serialization'],
  ['packages/simulation/src/state/clone-state.ts', 'full state clone'],
  ['packages/simulation/src/engine/create-simulation.ts', 'next entity id resolution'],
  ['packages/simulation/src/fixtures/determinism-fixture.ts', 'determinism fixture construction'],
  ['packages/simulation/src/invariants/check-invariants.ts', 'all-entity invariant validation']
])

function readDirectory(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...readDirectory(path))
    } else if (entry.name.endsWith('.ts')) {
      files.push(path)
    }
  }
  return files
}

describe('ECS subset iteration architecture', () => {
  it('keeps aliveIds callers limited to documented global iteration', () => {
    const violations: string[] = []
    for (const root of SOURCE_ROOTS) {
      for (const file of readDirectory(root)) {
        const relativePath = relative(ROOT, file)
        const matches = readFileSync(file, 'utf8').match(/\.aliveIds\(\)/g) ?? []
        if (matches.length === 0) {
          continue
        }
        if (!GLOBAL_ITERATION_ALLOWLIST.has(relativePath)) {
          violations.push(`${relativePath}: use World.query() for subset iteration`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('documents every global aliveIds caller', () => {
    expect([...GLOBAL_ITERATION_ALLOWLIST.values()]).toEqual([
      'canonical entity serialization',
      'full state clone',
      'next entity id resolution',
      'determinism fixture construction',
      'all-entity invariant validation'
    ])
  })
})
