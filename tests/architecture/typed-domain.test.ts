import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Static guard for the typed-domain policy (docs/engineering-standard.md),
 * mandatory in every package, app, tool, and test.
 *
 * Fails when source uses an unsafe `as string` / `as unknown` cast or types a
 * known key set as `Record<string, X>`. Runtime boundaries must narrow with the
 * `@rts/shared` parse helpers instead.
 */

const REPO_ROOT = process.cwd()
const SCAN_ROOTS = ['packages', 'apps', 'tools', 'tests'].map((dir) => join(REPO_ROOT, dir))

/** Intentional, dynamic-key `Record<string, X>` boundaries. */
const RECORD_STRING_ALLOWLIST = new Set([
  'packages/shared/src/primitives/parse.ts',
  'packages/shared/src/maps/map.ts',
  'packages/shared/src/domain/commands.ts',
  'packages/shared/src/assets/asset-manifest.ts',
  'packages/protocol/src/messages/command.ts',
  'packages/renderer/src/terrain/autotile.ts',
  'apps/web/src/features/laboratory/browser/asset-key-tree.tsx',
  'apps/web/src/features/match/lifecycle/match-debug.ts',
  'tools/assets/src/pipeline/prepare-assets.ts',
  // Test boundaries that mirror runtime JSON/debug shapes.
  'tests/architecture/public-api.test.ts',
  'tests/architecture/renderer-lockfile-consistency.test.ts',
  'tests/e2e/support/settle.ts',
  'tests/unit/renderer/terrain-autotile.test.ts'
])

/** Documented `as unknown` boundaries: framework mocks and namespace introspection. */
const AS_CAST_ALLOWLIST = new Set(['tests/unit/renderer/progress-bar.test.ts', 'tests/architecture/public-api.test.ts'])

/** Generated or curated data, exempt from the policy. */
const GENERATED = [join('apps', 'web', 'src', 'shared', 'ui'), join('tools', 'assets', 'src', 'curated.ts')]

function isGenerated(path: string): boolean {
  return GENERATED.some((fragment) => path.includes(fragment))
}

function collectSourceFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'test-results' || entry === 'playwright-report') {
      continue
    }
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, out)
      continue
    }
    if ((entry.endsWith('.ts') || entry.endsWith('.tsx')) && !entry.endsWith('.d.ts')) {
      out.push(full)
    }
  }
}

function sourceFiles(): string[] {
  const result: string[] = []
  for (const root of SCAN_ROOTS) {
    for (const dir of readdirSync(root)) {
      const src = join(root, dir, 'src')
      const tests = join(root, dir, 'tests')
      for (const candidate of [src, tests, join(root, dir)]) {
        try {
          if (statSync(candidate).isDirectory()) {
            collectSourceFiles(candidate, result)
            break
          }
        } catch {
          // Try the next candidate layout.
        }
      }
    }
  }
  const unique = [...new Set(result)]
  return unique.filter((file) => !isGenerated(file))
}

function isStringOrUnknown(node: ts.Node): boolean {
  return node.kind === ts.SyntaxKind.StringKeyword || node.kind === ts.SyntaxKind.UnknownKeyword
}

function isRecordOfString(node: ts.Node): boolean {
  if (!ts.isTypeReferenceNode(node) || !ts.isIdentifier(node.typeName) || node.typeName.text !== 'Record') {
    return false
  }
  const args = node.typeArguments
  return args !== undefined && args.length >= 1 && isStringOrUnknown(args[0]!)
}

function findViolations(file: string, predicate: (node: ts.Node) => boolean): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const violations: string[] = []
  const visit = (node: ts.Node): void => {
    if (predicate(node)) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart())
      violations.push(`${relative(REPO_ROOT, file)}:${line + 1}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return violations
}

describe('typed-domain policy (mandatory everywhere)', () => {
  const files = sourceFiles()

  it('scans the whole repository source (sanity)', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('uses no `as string` / `as unknown` casts outside the documented allowlist', () => {
    const violations = files
      .filter((file) => !AS_CAST_ALLOWLIST.has(relative(REPO_ROOT, file)))
      .flatMap((file) => findViolations(file, (node) => ts.isAsExpression(node) && isStringOrUnknown(node.type)))
    expect(violations).toEqual([])
  })

  it('never types a known key set as Record<string, X> outside the boundary allowlist', () => {
    const violations = files
      .filter((file) => !RECORD_STRING_ALLOWLIST.has(relative(REPO_ROOT, file)))
      .flatMap((file) => findViolations(file, isRecordOfString))
    expect(violations).toEqual([])
  })
})
