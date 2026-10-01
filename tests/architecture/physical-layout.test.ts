import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const WORKSPACE_ROOT = process.cwd()

function entriesAt(path: string): string[] {
  return readdirSync(join(WORKSPACE_ROOT, path)).sort()
}

function expectEntries(path: string, expected: readonly string[]): void {
  expect(entriesAt(path), `${path} must keep its approved direct layout`).toEqual([...expected].sort())
}

function expectAbsent(path: string): void {
  expect(existsSync(join(WORKSPACE_ROOT, path)), `${path} was moved and must not be restored`).toBe(false)
}

describe('physical layout', () => {
  it('keeps migrated source roots organized by domain', () => {
    expectEntries('packages/shared/src', ['assets', 'domain', 'index.ts', 'maps', 'primitives', 'rng'])
    expectEntries('packages/renderer/src', [
      'assets',
      'core',
      'effects',
      'index.ts',
      'input',
      'resources',
      'terrain',
      'units',
      'world'
    ])
    expectEntries('packages/simulation/src', [
      'canonical',
      'commands',
      'contracts',
      'data',
      'determinism-fixture.ts',
      'domain',
      'ecs',
      'engine',
      'fixtures',
      'index.ts',
      'invariants',
      'movement',
      'orders',
      'placement',
      'resources',
      'snapshot',
      'state',
      'systems'
    ])
    expectEntries('apps/server/src', ['bootstrap', 'content', 'index.ts', 'main.ts', 'sessions', 'transport'])
  })

  it('keeps migrated test roots organized by suite and domain', () => {
    expectEntries('tests', [
      'architecture',
      'contracts',
      'determinism',
      'e2e',
      'fixtures',
      'fuzz',
      'integration',
      'invariants',
      'orders',
      'simulation',
      'unit'
    ])
    expectEntries('tests/fixtures', ['index.ts', 'seeds.ts', 'simulation'])
    expectEntries('tests/simulation', ['combat', 'economy', 'hash-golden.test.ts', 'lifecycle', 'serialization'])
    expectEntries('tests/unit', [
      'game-data',
      'protocol',
      'renderer',
      'shared',
      'simulation',
      'terrain-parity.test.ts',
      'tools',
      'web'
    ])
    expectEntries('tests/e2e', [
      'economy',
      'laboratory',
      'match',
      'regression',
      'responsive',
      'support',
      'web-routes.spec.ts'
    ])
    expectEntries('tests/e2e/laboratory', [
      'browser',
      'determinism-browser.spec.ts',
      'diagnostics',
      'editor',
      'renderer-lifecycle.spec.ts',
      'renderer-perf.spec.ts',
      'sprite-fallback.spec.ts',
      'sprites-lab-responsive.spec.ts'
    ])
  })

  it('keeps only migration-proven legacy paths absent', () => {
    for (const path of [
      'apps/server/src/demo.ts',
      'apps/server/src/demo/scenarios.ts',
      'apps/server/src/match-bootstrap.ts',
      'packages/renderer/src/renderer.ts',
      'packages/renderer/src/render-layers.ts',
      'packages/renderer/src/terrain-layer.ts',
      'packages/shared/src/fixed.ts',
      'packages/shared/src/ids.ts',
      'packages/shared/src/map.ts',
      'packages/simulation/src/formation.ts',
      'tests/fixtures/commands.ts',
      'tests/fixtures/identity.ts',
      'tests/fixtures/world.ts',
      'tests/e2e/settle.ts',
      'tests/simulation/basic-combat.test.ts',
      'tests/unit/asset-pipeline.test.ts'
    ]) {
      expectAbsent(path)
    }
  })
})
