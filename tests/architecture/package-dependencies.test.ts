import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const WORKSPACE_ROOT = process.cwd()

interface ModuleEntry {
  readonly name: string
  readonly root: string
  /** Directories under `root` excluded from the scan (diagnostic harness pages). */
  readonly exclude?: readonly string[]
  /** Allowed `@rts/*` dependencies (master plan §4.2). */
  readonly allowed: readonly string[]
}

const MODULES: readonly ModuleEntry[] = [
  { name: 'shared', root: 'packages/shared/src', allowed: [] },
  { name: 'game-data', root: 'packages/game-data/src', allowed: ['@rts/shared'] },
  { name: 'pathfinding', root: 'packages/pathfinding/src', allowed: ['@rts/shared'] },
  { name: 'protocol', root: 'packages/protocol/src', allowed: ['@rts/shared'] },
  {
    name: 'simulation',
    root: 'packages/simulation/src',
    allowed: ['@rts/shared', '@rts/game-data', '@rts/pathfinding']
  },
  { name: 'ai', root: 'packages/ai/src', allowed: ['@rts/shared', '@rts/game-data', '@rts/simulation'] },
  { name: 'renderer', root: 'packages/renderer/src', allowed: ['@rts/shared'] },
  { name: 'audio', root: 'packages/audio/src', allowed: ['@rts/shared'] },
  {
    name: 'server',
    root: 'apps/server/src',
    allowed: ['@rts/shared', '@rts/simulation', '@rts/protocol', '@rts/ai', '@rts/game-data']
  },
  {
    name: 'web',
    root: 'apps/web/src',
    // Diagnostic harnesses are browser-only tools, not part of the playable
    // client package dependency surface.
    exclude: ['diagnostics'],
    allowed: ['@rts/shared', '@rts/protocol', '@rts/renderer', '@rts/audio']
  },
  { name: 'benchmark', root: 'tools/benchmark/src', allowed: ['@rts/shared', '@rts/simulation'] },
  { name: 'balance', root: 'tools/balance/src', allowed: [] }
]

const IMPORT_PATTERN = /from\s+['"](@rts\/[^'"]+)['"]/g

function collectTsFiles(dir: string, exclude: readonly string[]): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (exclude.includes(entry)) {
      continue
    }
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      out.push(...collectTsFiles(full, exclude))
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      out.push(full)
    }
  }
  return out
}

function basePackage(specifier: string): string {
  return specifier.split('/').slice(0, 2).join('/')
}

describe('package dependency direction', () => {
  for (const module of MODULES) {
    it(`${module.name} imports only its allowed @rts packages`, () => {
      const root = join(WORKSPACE_ROOT, module.root)
      const files = collectTsFiles(root, module.exclude ?? [])
      expect(files.length, `${module.root} should contain source files`).toBeGreaterThan(0)

      const violations: string[] = []
      for (const file of files) {
        const content = readFileSync(file, 'utf8')
        for (const match of content.matchAll(IMPORT_PATTERN)) {
          const specifier = match[1] ?? ''
          const base = basePackage(specifier)
          if (!module.allowed.includes(base)) {
            violations.push(`${file.replace(`${WORKSPACE_ROOT}/`, '')}: imports ${specifier}`)
          }
        }
      }
      expect(violations).toEqual([])
    })
  }
})
